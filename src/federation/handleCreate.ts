import { isActor, Note } from "@fedify/fedify";

import { log } from "./log";
import { prisma } from "~/lib/prisma";
import {
  formatNoteAttachments,
  getTagFromNote,
  isUniqueConstraintError,
  upsertActor,
} from "~/lib/utils-federation";

import type { Create, InboxContext } from "@fedify/fedify";

export async function handleCreate(_ctx: InboxContext<unknown>, create: Create) {
  try {
    log(`Received Create activity: ${create.id?.href}`);

    const object = await create.getObject();
    if (!(object instanceof Note)) return;

    const actor = create.actorId;
    if (actor == null) return;

    const author = await object.getAttribution();
    if (!isActor(author) || author.id?.href !== actor.href) return;

    const replyTarget = await object.getReplyTarget();
    if (replyTarget == null || !(replyTarget instanceof Note)) {
      log("The Note does not have an replyTarget, skipping");
      return;
    }

    const uri = replyTarget.id?.toString();
    const post = await prisma.posts.findFirst({ where: { uri } });
    const parentComment = await prisma.comment.findFirst({ where: { uri } });

    if (!post && !parentComment) {
      log("replyTarget target not found in posts or comments");
      return;
    }

    const actorRecord = await upsertActor(author);
    if (!actorRecord || object.id == null) return;

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
        return;
      }
      throw error;
    }

    log(`Saved comment: ${object.id.href}`);
  } catch (error) {
    log("Error processing Create activity:", error);
  }
}
