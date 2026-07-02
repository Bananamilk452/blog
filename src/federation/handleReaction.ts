import { Emoji, EmojiReact, isActor, Like } from "@fedify/vocab";

import { log } from "./log";
import { prisma } from "~/lib/prisma";
import { isUniqueConstraintError, upsertActor } from "~/lib/utils-federation";

import type { InboxActivityStatus } from "./logInboxActivity";
import type { InboxContext } from "@fedify/fedify";

type ReactionActivity = Like | EmojiReact;

const LIKE_CONTENT = "❤️";

export async function handleReaction(
  _ctx: InboxContext<unknown>,
  reaction: ReactionActivity,
): Promise<InboxActivityStatus> {
  log(
    `Received ${reaction instanceof Like ? "Like" : "EmojiReact"} activity: ${reaction.id?.href}`,
  );

  if (reaction.actorId == null || reaction.objectId == null || reaction.id == null) {
    return "ignored";
  }

  const actor = await reaction.getActor();
  if (!isActor(actor) || actor.id?.href !== reaction.actorId.href) return "ignored";

  const targetUri = reaction.objectId.href;
  const [post, comment] = await Promise.all([
    prisma.posts.findFirst({ where: { uri: targetUri }, select: { id: true } }),
    prisma.comment.findFirst({ where: { uri: targetUri }, select: { id: true } }),
  ]);

  if (!post && !comment) {
    log(`Reaction target not found: ${targetUri}`);
    return "ignored";
  }

  const actorRecord = await upsertActor(actor);
  if (!actorRecord) return "ignored";

  const customEmoji = await getCustomEmoji(reaction);
  const content = reaction.content?.toString() || LIKE_CONTENT;

  try {
    await prisma.reaction.create({
      data: {
        uri: reaction.id.href,
        activityType: reaction instanceof Like ? "Like" : "EmojiReact",
        content,
        actorId: actorRecord.id,
        postId: post?.id,
        commentId: comment?.id,
        targetUri,
        to: reaction.toIds.map((to) => to.href),
        cc: reaction.ccIds.map((cc) => cc.href),
        emojiName: customEmoji?.name,
        emojiIconUrl: customEmoji?.iconUrl,
        emojiIconMediaType: customEmoji?.iconMediaType,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      log(`Reaction already exists, skipping duplicate: ${reaction.id.href}`);
      return "ignored";
    }
    throw error;
  }

  log(`Saved reaction: ${reaction.id.href}`);
  return "handled";
}

async function getCustomEmoji(reaction: ReactionActivity) {
  for await (const tag of reaction.getTags()) {
    if (!(tag instanceof Emoji)) continue;

    const icon = await tag.getIcon();
    const iconUrl = icon?.url?.href?.toString() ?? null;

    return {
      name: tag.name?.toString() ?? reaction.content?.toString(),
      iconUrl,
      iconMediaType: icon?.mediaType ?? null,
    };
  }

  return null;
}
