import { isActor, Note } from "@fedify/vocab";

import { prisma } from "~/lib/prisma";
import { federationLog as log } from "~/lib/server-log";
import { formatNoteAttachments, getTagFromNote, upsertActor } from "~/lib/utils-federation";

import type { InboxActivityStatus } from "./logInboxActivity";
import type { InboxContext } from "@fedify/fedify";
import type { Update } from "@fedify/vocab";

export async function handleUpdate(
  _ctx: InboxContext<unknown>,
  update: Update,
): Promise<InboxActivityStatus> {
  log(`Received Update activity: ${update.id?.href}`);

  const object = await update.getObject();
  if (!object) return "ignored";

  if (object instanceof Note) {
    if (object.id == null) return "ignored";

    const comment = await prisma.comment.findFirst({
      where: { uri: object.id.href },
      include: { actor: true },
    });

    if (!comment) {
      log(`Comment not found for update: ${object.id.href}`);
      return "ignored";
    }

    if (update.actorId?.href !== comment.actor.uri) {
      log(
        `Unauthorized update attempt. Request actor: ${update.actorId?.href}, Comment actor: ${comment.actor.uri}`,
      );
      return "ignored";
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
    return "handled";
  }

  if (isActor(object)) {
    if (update.actorId?.href !== object.id?.href) {
      log("Unauthorized actor update attempt: Actor can only update themselves");
      return "ignored";
    }

    await upsertActor(object);
    log(`Updated actor profile: ${object.id?.href}`);
    return "handled";
  }

  return "ignored";
}
