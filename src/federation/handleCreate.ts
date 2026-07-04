import { isActor, Note } from "@fedify/vocab";

import { log } from "./log";
import { prisma } from "~/lib/prisma";
import {
  formatNoteAttachments,
  getTagFromNote,
  isPublic,
  isUniqueConstraintError,
  upsertActor,
} from "~/lib/utils-federation";

import type { InboxActivityStatus } from "./logInboxActivity";
import type { InboxContext } from "@fedify/fedify";
import type { Create } from "@fedify/vocab";

export async function handleCreate(
  _ctx: InboxContext<unknown>,
  create: Create,
): Promise<InboxActivityStatus> {
  log(`Received Create activity: ${create.id?.href}`);

  const object = await create.getObject();
  if (!(object instanceof Note)) return "ignored";

  const actor = create.actorId;
  if (actor == null) return "ignored";

  const author = await object.getAttribution();
  if (!isActor(author) || author.id?.href !== actor.href) return "ignored";

  const mainActor = await prisma.mainActor.findFirst({ include: { actor: true } });
  if (!mainActor) return "ignored";

  const recipientUris = [...object.toIds, ...object.ccIds].map((recipient) => recipient.href);
  const isDirectToMainActor =
    !isPublic(recipientUris) && recipientUris.includes(mainActor.actor.uri);

  const replyTarget = await object.getReplyTarget();
  const replyTargetUri = replyTarget instanceof Note ? replyTarget.id?.toString() : undefined;

  const post = replyTargetUri
    ? await prisma.posts.findFirst({ where: { uri: replyTargetUri } })
    : null;
  const parentComment = replyTargetUri
    ? await prisma.comment.findFirst({ where: { uri: replyTargetUri } })
    : null;

  if (replyTargetUri && !post && !parentComment && !isDirectToMainActor) {
    log("replyTarget target not found in posts or comments");
    return "ignored";
  }

  if (!replyTargetUri && !isDirectToMainActor) {
    log("The Note does not have a local replyTarget or direct local recipient, skipping");
    return "ignored";
  }

  const actorRecord = await upsertActor(author);
  if (!actorRecord || object.id == null) return "ignored";

  if (!post && !parentComment) {
    try {
      await prisma.directMessage.create({
        data: {
          uri: object.id.href,
          actorId: actorRecord.id,
          content: object.content?.toString() || "",
          url: object.url?.href?.toString(),
          to: object.toIds.map((to) => to.href),
          cc: object.ccIds.map((cc) => cc.href),
          mentions: getTagFromNote(object),
          replyTargetUri,
          attachment: { createMany: { data: await formatNoteAttachments(object) } },
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        log(`Direct message already exists, skipping duplicate Create: ${object.id.href}`);
        return "ignored";
      }
      throw error;
    }

    log(`Saved direct message: ${object.id.href}`);
    return "handled";
  }

  try {
    await prisma.comment.create({
      data: {
        uri: object.id.href,
        actorId: actorRecord.id,
        postId: post?.id ?? parentComment!.postId,
        parentId: parentComment?.id ?? null,
        content: object.content?.toString() || "",
        url: object.url?.href?.toString(),
        to: object.toIds.map((to) => to.href),
        cc: object.ccIds.map((cc) => cc.href),
        mentions: getTagFromNote(object),
        attachment: { createMany: { data: await formatNoteAttachments(object) } },
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      log(`Comment already exists, skipping duplicate Create: ${object.id.href}`);
      return "ignored";
    }
    throw error;
  }

  log(`Saved comment: ${object.id.href}`);
  return "handled";
}
