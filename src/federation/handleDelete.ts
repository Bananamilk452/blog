import { prisma } from "~/lib/prisma";
import { federationLog as log } from "~/lib/server-log";

import type { InboxActivityStatus } from "./logInboxActivity";
import type { InboxContext } from "@fedify/fedify";
import type { Delete } from "@fedify/vocab";

export async function handleDelete(
  _ctx: InboxContext<unknown>,
  del: Delete,
): Promise<InboxActivityStatus> {
  log(`Received Delete activity: ${del.id?.href}`);

  const objectId = del.objectId;
  if (objectId == null) {
    log("The Delete object does not have an objectId:", del);
    return "ignored";
  }

  const comment = await prisma.comment.findFirst({
    where: { uri: objectId.href },
    include: { actor: true },
  });

  if (!comment) {
    log(`Comment not found for deletion: ${objectId.href}`);
    return "ignored";
  }

  if (del.actorId?.href !== comment.actor.uri) {
    log(
      `Unauthorized delete attempt. Request actor: ${del.actorId?.href}, Comment actor: ${comment.actor.uri}`,
    );
    return "ignored";
  }

  await prisma.comment.delete({ where: { id: comment.id } });
  log(`Deleted comment: ${comment.id}`);
  return "handled";
}
