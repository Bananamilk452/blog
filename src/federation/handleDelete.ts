import { prisma } from "~/lib/prisma";

import type { Delete, InboxContext } from "@fedify/fedify";

export async function handleDelete(_ctx: InboxContext<unknown>, del: Delete) {
  const objectId = del.objectId;
  if (objectId == null) return;

  const comment = await prisma.comment.findFirst({
    where: { uri: objectId.href },
    include: { actor: true },
  });

  if (!comment) return;

  if (del.actorId?.href !== comment.actor.uri) return;

  await prisma.comment.delete({ where: { id: comment.id } });
}
