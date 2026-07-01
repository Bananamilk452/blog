import { isActor, Note } from "@fedify/fedify";

import { log } from "./log";
import { prisma } from "~/lib/prisma";
import { formatNoteAttachments, getTagFromNote, upsertActor } from "~/lib/utils-federation";

import type { InboxContext, Update } from "@fedify/fedify";

export async function handleUpdate(_ctx: InboxContext<unknown>, update: Update) {
  log(`Received Update activity: ${update.id?.href}`);

  const object = await update.getObject();
  if (!object) return;

  if (object instanceof Note) {
    if (object.id == null) return;

    const comment = await prisma.comment.findFirst({
      where: { uri: object.id.href },
      include: { actor: true },
    });

    if (!comment) {
      log(`Comment not found for update: ${object.id.href}`);
      return;
    }

    if (update.actorId?.href !== comment.actor.uri) {
      log(
        `Unauthorized update attempt. Request actor: ${update.actorId?.href}, Comment actor: ${comment.actor.uri}`,
      );
      return;
    }

    await prisma.comment.update({
      where: { id: comment.id },
      data: {
        content: object.content?.toString() || "",
        url: object.url?.href?.toString(),
        to: object.toIds.map((to) => to.href),
        cc: object.ccIds.map((cc) => cc.href),
        mentions: getTagFromNote(object),
        attachment: {
          deleteMany: {},
          createMany: { data: await formatNoteAttachments(object) },
        },
      },
    });

    log(`Updated comment: ${comment.id}`);
    return;
  }

  if (isActor(object)) {
    if (update.actorId?.href !== object.id?.href) {
      log("Unauthorized actor update attempt: Actor can only update themselves");
      return;
    }

    await upsertActor(object);
    log(`Updated actor profile: ${object.id?.href}`);
  }
}
