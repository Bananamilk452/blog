import { isActor } from "@fedify/vocab";

import { prisma } from "~/lib/prisma";
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
    prisma.posts.findFirst({ where: { uri: targetUri }, select: { id: true } }),
    prisma.comment.findFirst({ where: { uri: targetUri }, select: { id: true } }),
  ]);

  if (!post && !comment) {
    log(`Announce target not found: ${targetUri}`);
    return "ignored";
  }

  await upsertActor(actor);

  return "handled";
}
