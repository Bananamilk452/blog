import { isActor } from "@fedify/vocab";

import { prisma } from "~/lib/prisma";
import { sendPushNotificationToAdmins } from "~/lib/push-notifications";
import { federationLog as log } from "~/lib/server-log";
import { upsertActor } from "~/lib/utils-federation";

import type { InboxActivityStatus } from "./logInboxActivity";
import type { InboxContext } from "@fedify/fedify";
import type { Announce } from "@fedify/vocab";

export async function handleAnnounce(
  _ctx: InboxContext<unknown>,
  announce: Announce,
): Promise<InboxActivityStatus> {
  log(`Received Announce activity: ${announce.id?.href}`);

  if (announce.actorId == null || announce.objectId == null) return "ignored";

  const actor = await announce.getActor();
  if (!isActor(actor) || actor.id?.href !== announce.actorId.href) return "ignored";

  const targetUri = announce.objectId.href;
  const [post, comment] = await Promise.all([
    prisma.posts.findFirst({
      where: { uri: targetUri },
      select: { id: true, title: true, slug: true },
    }),
    prisma.comment.findFirst({
      where: { uri: targetUri },
      select: { id: true, post: { select: { title: true, slug: true } } },
    }),
  ]);

  if (!post && !comment) {
    log(`Announce target not found: ${targetUri}`);
    return "ignored";
  }

  const actorRecord = await upsertActor(actor);
  const targetPost = post ?? comment?.post;

  if (actorRecord) {
    await sendPushNotificationToAdmins({
      title: "새 리노트",
      body: `${actorRecord.name ?? actorRecord.username}님이 ${targetPost?.title ?? "게시글"}을 리노트했습니다.`,
      url: getPostHref(targetPost?.slug ?? null),
      tag: "activitypub-renote",
    });
  }

  return "handled";
}

function getPostHref(slug: string | null) {
  return slug ? `/post/${slug}` : "/dashboard/notifications";
}
