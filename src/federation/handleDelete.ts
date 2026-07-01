import { log } from "./log";
import { prisma } from "~/lib/prisma";

import type { Delete, InboxContext } from "@fedify/fedify";

export async function handleDelete(_ctx: InboxContext<unknown>, del: Delete) {
  log(`Received Delete activity: ${del.id?.href}`);

  const objectId = del.objectId;
  if (objectId == null) {
    log("The Delete object does not have an objectId:", del);
    return;
  }

  const comment = await prisma.comment.findFirst({
    where: { uri: objectId.href },
    include: { actor: true },
  });

  if (!comment) {
    log(`Comment not found for deletion: ${objectId.href}`);
    return;
  }

  if (del.actorId?.href !== comment.actor.uri) {
    log(
      `Unauthorized delete attempt. Request actor: ${del.actorId?.href}, Comment actor: ${comment.actor.uri}`,
    );
    return;
  }

  await prisma.comment.delete({ where: { id: comment.id } });
  log(`Deleted comment: ${comment.id}`);
}
