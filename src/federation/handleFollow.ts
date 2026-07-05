import { Accept } from "@fedify/vocab";

import { prisma } from "~/lib/prisma";
import { federationLog as log } from "~/lib/server-log";
import { isUniqueConstraintError, upsertActor } from "~/lib/utils-federation";

import type { InboxActivityStatus } from "./logInboxActivity";
import type { InboxContext } from "@fedify/fedify";
import type { Follow } from "@fedify/vocab";

export async function handleFollow(
  ctx: InboxContext<unknown>,
  follow: Follow,
): Promise<InboxActivityStatus> {
  log(`Received Follow activity: ${follow.id?.href}`);

  if (follow.objectId == null) {
    log("The Follow object does not have an object:", follow);
    return "ignored";
  }

  const object = ctx.parseUri(follow.objectId);
  if (object == null || object.type !== "actor") {
    log("The Follow object's object is not an actor:", follow);
    return "ignored";
  }

  const follower = await follow.getActor();
  if (follower?.id == null || follower.inboxId == null) {
    log("The Follow object does not have an actor:", follow);
    return "ignored";
  }

  log(
    `Processing follow from @${follower.preferredUsername}@${follower.id.hostname} to ${object.identifier}`,
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
    return "ignored";
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
      throw error;
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

  return "handled";
}
