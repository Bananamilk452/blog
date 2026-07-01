import { Follow } from "@fedify/fedify";

import { prisma } from "~/lib/prisma";

import type { InboxContext, Undo } from "@fedify/fedify";

export async function handleUndo(ctx: InboxContext<unknown>, undo: Undo) {
  const object = await undo.getObject();
  if (!(object instanceof Follow)) return;
  if (undo.actorId == null || object.objectId == null) return;

  const parsed = ctx.parseUri(object.objectId);
  if (parsed == null || parsed.type !== "actor") return;

  const followingActor = await prisma.actor.findFirst({
    where: {
      user: {
        username: parsed.identifier,
      },
    },
  });

  const followerActor = await prisma.actor.findFirst({
    where: {
      uri: undo.actorId.href,
    },
  });

  if (!followingActor || !followerActor) return;

  await prisma.follows.deleteMany({
    where: {
      followingId: followingActor.id,
      followerId: followerActor.id,
    },
  });
}
