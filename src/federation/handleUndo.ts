import { EmojiReact, Follow, Like } from "@fedify/vocab";

import { log } from "./log";
import { prisma } from "~/lib/prisma";

import type { InboxActivityStatus } from "./logInboxActivity";
import type { InboxContext } from "@fedify/fedify";
import type { Undo } from "@fedify/vocab";

export async function handleUndo(
  ctx: InboxContext<unknown>,
  undo: Undo,
): Promise<InboxActivityStatus> {
  log(`Received Undo activity: ${undo.id?.href}`);

  const object = await undo.getObject();

  if (object instanceof Like || object instanceof EmojiReact) {
    if (undo.actorId == null || object.id == null) return "ignored";

    await prisma.reaction.deleteMany({
      where: {
        uri: object.id.href,
        actor: { uri: undo.actorId.href },
      },
    });

    return "handled";
  }

  if (!(object instanceof Follow)) {
    if (undo.objectId == null || undo.actorId == null) return "ignored";

    const result = await prisma.reaction.deleteMany({
      where: {
        uri: undo.objectId.href,
        actor: { uri: undo.actorId.href },
      },
    });

    return result.count > 0 ? "handled" : "ignored";
  }

  if (undo.actorId == null || object.objectId == null) return "ignored";

  const parsed = ctx.parseUri(object.objectId);
  if (parsed == null || parsed.type !== "actor") return "ignored";

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
    return "ignored";
  }

  log(`Processing unfollow from ${followerActor.handle} to @${followingActor.handle}`);

  await prisma.follows.deleteMany({
    where: {
      followingId: followingActor.id,
      followerId: followerActor.id,
    },
  });

  return "handled";
}
