"use server";

import { prisma } from "~/lib/prisma";
import { getValidAdminSession } from "~/lib/utils-server";

const NOTIFICATION_ACTIVITY_TYPES = ["Create", "Like", "EmojiReact", "Announce"];

export type InboxNotificationItem = {
  id: string;
  kind: "comment" | "like" | "emoji" | "renote";
  label: string;
  actorName: string;
  actorHandle: string;
  content: string;
  targetTitle: string;
  href: string | null;
  receivedAt: Date;
};

export type InboxOperationSummary = {
  inboxReceived24h: number;
  failedInboxCount: number;
  pendingInboxCount: number;
  followerCount: number;
  recentFollowActivities: Array<{
    id: string;
    activityType: string;
    actorUri: string | null;
    actor: {
      name: string | null;
      username: string;
      handle: string;
      url: string | null;
      avatarUrl: string | null;
    } | null;
    receivedAt: Date;
  }>;
  recentErrors: Array<{
    id: string;
    activityType: string;
    actorUri: string | null;
    objectId: string | null;
    errorMessage: string | null;
    receivedAt: Date;
  }>;
  recentActorUpdates: Array<{
    id: string;
    name: string | null;
    handle: string;
    updatedAt: Date;
  }>;
};

export async function getInboxActivityLogs(options?: {
  page?: number;
  limit?: number;
  status?: string;
  activityType?: string;
}) {
  await getValidAdminSession();

  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const where = {
    ...(options?.status ? { status: options.status } : {}),
    ...(options?.activityType ? { activityType: options.activityType } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.inboxActivityLog.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inboxActivityLog.count({ where }),
  ]);

  return { records, total };
}

export async function getInboxActivityLogTypes() {
  await getValidAdminSession();

  const records = await prisma.inboxActivityLog.findMany({
    distinct: ["activityType"],
    orderBy: { activityType: "asc" },
    select: { activityType: true },
  });

  return records.map((record) => record.activityType);
}

export async function getInboxOperationSummary(): Promise<InboxOperationSummary> {
  await getValidAdminSession();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const mainActor = await prisma.mainActor.findFirst({ include: { actor: true } });

  const [
    inboxReceived24h,
    failedInboxCount,
    pendingInboxCount,
    followerCount,
    recentFollowActivities,
    recentErrors,
    recentActorUpdates,
  ] = await Promise.all([
    prisma.inboxActivityLog.count({ where: { receivedAt: { gte: since } } }),
    prisma.inboxActivityLog.count({ where: { status: "failed" } }),
    prisma.inboxActivityLog.count({ where: { status: "received" } }),
    mainActor
      ? prisma.follows.count({ where: { followingId: mainActor.actorId } })
      : Promise.resolve(0),
    prisma.inboxActivityLog.findMany({
      where: { activityType: { in: ["Follow", "Undo"] } },
      orderBy: { receivedAt: "desc" },
      take: 5,
      select: {
        id: true,
        activityType: true,
        actorUri: true,
        receivedAt: true,
      },
    }),
    prisma.inboxActivityLog.findMany({
      where: { status: "failed" },
      orderBy: { receivedAt: "desc" },
      take: 5,
      select: {
        id: true,
        activityType: true,
        actorUri: true,
        objectId: true,
        errorMessage: true,
        receivedAt: true,
      },
    }),
    prisma.actor.findMany({
      where: { userId: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        handle: true,
        updatedAt: true,
      },
    }),
  ]);

  const followActorUris = recentFollowActivities.flatMap((activity) =>
    activity.actorUri ? [activity.actorUri] : [],
  );
  const followActors = await prisma.actor.findMany({
    where: { uri: { in: followActorUris } },
    select: {
      uri: true,
      name: true,
      username: true,
      handle: true,
      url: true,
      avatar: { select: { url: true } },
    },
  });
  const followActorsByUri = new Map(followActors.map((actor) => [actor.uri, actor]));

  return {
    inboxReceived24h,
    failedInboxCount,
    pendingInboxCount,
    followerCount,
    recentFollowActivities: recentFollowActivities.map((activity) => {
      const actor = activity.actorUri ? followActorsByUri.get(activity.actorUri) : null;

      return {
        ...activity,
        actor: actor
          ? {
              name: actor.name,
              username: actor.username,
              handle: actor.handle,
              url: actor.url,
              avatarUrl: actor.avatar?.url ?? null,
            }
          : null,
      };
    }),
    recentErrors,
    recentActorUpdates,
  };
}

export async function getInboxNotificationItems(limit = 20): Promise<InboxNotificationItem[]> {
  await getValidAdminSession();

  const logs = await prisma.inboxActivityLog.findMany({
    where: {
      status: "handled",
      activityType: { in: NOTIFICATION_ACTIVITY_TYPES },
    },
    orderBy: { receivedAt: "desc" },
    take: limit * 4,
  });

  const commentUris = logs
    .filter((log) => log.activityType === "Create" && log.objectId != null)
    .map((log) => log.objectId!);
  const reactionUris = logs
    .filter(
      (log) =>
        (log.activityType === "Like" || log.activityType === "EmojiReact") &&
        log.activityId != null,
    )
    .map((log) => log.activityId!);
  const announcedUris = logs
    .filter((log) => log.activityType === "Announce" && log.objectId != null)
    .map((log) => log.objectId!);
  const actorUris = logs.flatMap((log) => (log.actorUri ? [log.actorUri] : []));

  const [comments, reactions, announcedPosts, announcedComments, actors] = await Promise.all([
    prisma.comment.findMany({
      where: { uri: { in: commentUris } },
      include: {
        actor: true,
        post: { select: { title: true, slug: true } },
      },
    }),
    prisma.reaction.findMany({
      where: { uri: { in: reactionUris } },
      include: {
        actor: true,
        post: { select: { title: true, slug: true } },
        comment: {
          select: {
            url: true,
            post: { select: { title: true, slug: true } },
          },
        },
      },
    }),
    prisma.posts.findMany({
      where: { uri: { in: announcedUris } },
      select: { uri: true, title: true, slug: true },
    }),
    prisma.comment.findMany({
      where: { uri: { in: announcedUris } },
      select: {
        uri: true,
        url: true,
        post: { select: { title: true, slug: true } },
      },
    }),
    prisma.actor.findMany({ where: { uri: { in: actorUris } } }),
  ]);

  const commentsByUri = new Map(comments.map((comment) => [comment.uri, comment]));
  const reactionsByUri = new Map(reactions.map((reaction) => [reaction.uri, reaction]));
  const announcedPostsByUri = new Map(announcedPosts.map((post) => [post.uri, post]));
  const announcedCommentsByUri = new Map(
    announcedComments.map((comment) => [comment.uri, comment]),
  );
  const actorsByUri = new Map(actors.map((actor) => [actor.uri, actor]));
  const items: InboxNotificationItem[] = [];

  for (const log of logs) {
    if (log.activityType === "Create" && log.objectId) {
      const comment = commentsByUri.get(log.objectId);
      if (!comment) continue;

      items.push({
        id: log.id,
        kind: "comment",
        label: "댓글",
        actorName: comment.actor.name ?? comment.actor.username,
        actorHandle: comment.actor.handle,
        content: toPlainText(comment.content),
        targetTitle: comment.post.title,
        href: comment.url ?? getPostHref(comment.post.slug),
        receivedAt: log.receivedAt,
      });
    }

    if ((log.activityType === "Like" || log.activityType === "EmojiReact") && log.activityId) {
      const reaction = reactionsByUri.get(log.activityId);
      if (!reaction) continue;

      const post = reaction.post ?? reaction.comment?.post;
      if (!post) continue;

      items.push({
        id: log.id,
        kind: log.activityType === "Like" ? "like" : "emoji",
        label: log.activityType === "Like" ? "마음" : "이모지 리액션",
        actorName: reaction.actor.name ?? reaction.actor.username,
        actorHandle: reaction.actor.handle,
        content: reaction.content,
        targetTitle: post.title,
        href: reaction.comment?.url ?? getPostHref(post.slug),
        receivedAt: log.receivedAt,
      });
    }

    if (log.activityType === "Announce" && log.objectId) {
      const actor = log.actorUri ? actorsByUri.get(log.actorUri) : null;
      const post = announcedPostsByUri.get(log.objectId);
      const comment = announcedCommentsByUri.get(log.objectId);
      const targetPost = post ?? comment?.post;
      if (!targetPost) continue;

      items.push({
        id: log.id,
        kind: "renote",
        label: "리노트",
        actorName: actor?.name ?? actor?.username ?? log.actorUri ?? "알 수 없는 actor",
        actorHandle: actor?.handle ?? log.actorUri ?? "-",
        content: "리노트했습니다.",
        targetTitle: targetPost.title,
        href: comment?.url ?? getPostHref(targetPost.slug),
        receivedAt: log.receivedAt,
      });
    }

    if (items.length >= limit) break;
  }

  return items;
}

function getPostHref(slug: string | null) {
  return slug ? `/post/${slug}` : null;
}

function toPlainText(content: string) {
  return content.replace(/<[^>]*>/g, "").trim() || "내용 없음";
}
