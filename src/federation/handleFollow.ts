import { Accept } from "@fedify/fedify";

import { log } from "./log";
import { prisma } from "~/lib/prisma";
import { isUniqueConstraintError, upsertActor } from "~/lib/utils-federation";

import type { Follow, InboxContext } from "@fedify/fedify";

export async function handleFollow(ctx: InboxContext<unknown>, follow: Follow) {
  log(`Received Follow activity: ${follow.id?.href}`);

  if (follow.objectId == null) {
    log("The Follow object does not have an object:", follow);
    return;
  }

  const object = ctx.parseUri(follow.objectId);
  if (object == null || object.type !== "actor") {
    log("The Follow object's object is not an actor:", follow);
    return;
  }

  const follower = await follow.getActor();
  if (follower?.id == null || follower.inboxId == null) {
    log("The Follow object does not have an actor:", follow);
    return;
  }

  log(
    `Processing follow from @${follower.preferredUsername}@${follower.id.hostname} to @${object.handle}`,
  );

  const followingId = (
    await prisma.actor.findFirst({
      where: {
        user: {
          username: object.identifier,
        },
      },
    })
  )?.id;

  if (followingId == null) {
    log("Failed to find the actor to follow in the database:", object);
    return;
  }

  const followerId = (await upsertActor(follower)).id;

  try {
    await prisma.follows.create({
      data: {
        followingId,
        followerId,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      log("Error creating follow relationship:", error);
      return;
    }

    log("Follow relationship already exists; accepting again:", error);
  }

  await ctx.sendActivity(
    { identifier: object.identifier },
    follower,
    new Accept({
      actor: follow.objectId,
      to: follow.actorId,
      object: follow,
    }),
    { immediate: true },
  );
}
