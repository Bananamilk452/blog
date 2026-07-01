import { Follow } from "@fedify/fedify";

import { log } from "./log";
import { prisma } from "~/lib/prisma";

import type { InboxContext, Undo } from "@fedify/fedify";

export async function handleUndo(ctx: InboxContext<unknown>, undo: Undo) {
  log(`Received Undo activity: ${undo.id?.href}`);

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

  if (!followingActor || !followerActor) {
    log("Either following or follower actor not found.");
    return;
  }

  log(`Processing unfollow from ${followerActor.handle} to @${followingActor.handle}`);

  await prisma.follows.deleteMany({
    where: {
      followingId: followingActor.id,
      followerId: followerActor.id,
    },
  });
}
