import { isActor, Note } from "@fedify/fedify";

import { prisma } from "~/lib/prisma";
import { formatNoteAttachments, getTagFromNote, upsertActor } from "~/lib/utils-federation";

import type { InboxContext, Update } from "@fedify/fedify";

export async function handleUpdate(_ctx: InboxContext<unknown>, update: Update) {
  const object = await update.getObject();
  if (!object) return;

  if (object instanceof Note) {
    if (object.id == null) return;

    const comment = await prisma.comment.findFirst({
      where: { uri: object.id.href },
      include: { actor: true },
    });

    if (!comment) return;
    if (update.actorId?.href !== comment.actor.uri) return;

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
    return;
  }

  if (isActor(object)) {
    if (update.actorId?.href !== object.id?.href) return;

    await upsertActor(object);
  }
}
