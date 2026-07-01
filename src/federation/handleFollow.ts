import { Accept } from "@fedify/fedify";

import { prisma } from "~/lib/prisma";
import { isUniqueConstraintError, upsertActor } from "~/lib/utils-federation";

import type { Follow, InboxContext } from "@fedify/fedify";

export async function handleFollow(ctx: InboxContext<unknown>, follow: Follow) {
  if (follow.objectId == null) return;

  const object = ctx.parseUri(follow.objectId);
  if (object == null || object.type !== "actor") return;

  const follower = await follow.getActor();
  if (follower?.id == null || follower.inboxId == null) return;

  const followingId = (
    await prisma.actor.findFirst({
      where: {
        user: {
          username: object.identifier,
        },
      },
    })
  )?.id;

  if (followingId == null) return;

  const followerId = (await upsertActor(follower)).id;

  try {
    await prisma.follows.create({
      data: {
        followingId,
        followerId,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) return;
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
