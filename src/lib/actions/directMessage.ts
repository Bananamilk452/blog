"use server";

import { uploadFile } from "./s3";
import { createDirectMessageReply as createDirectMessageReplyModel } from "~/lib/models/directMessage";
import { prisma } from "~/lib/prisma";
import { getValidAdminSession } from "~/lib/utils-server";

export async function getDirectMessages(options?: { page?: number; limit?: number }) {
  await getValidAdminSession();

  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;

  const mainActor = await prisma.mainActor.findFirst({ include: { actor: true } });
  if (!mainActor) {
    throw new Error("Main actor is not defined");
  }

  const messages = await prisma.directMessage.findMany({
    orderBy: { createdAt: "asc" },
    include: { actor: { include: { avatar: true } }, attachment: true },
  });

  const messagesByUri = new Map(messages.map((message) => [message.uri, message]));
  const threadMap = new Map<string, typeof messages>();

  for (const message of messages) {
    let root = message;
    const visitedUris = new Set<string>();

    while (root.replyTargetUri) {
      if (visitedUris.has(root.uri)) break;
      visitedUris.add(root.uri);

      const parent = messagesByUri.get(root.replyTargetUri);
      if (!parent) break;
      root = parent;
    }

    const thread = threadMap.get(root.uri) ?? [];
    thread.push(message);
    threadMap.set(root.uri, thread);
  }

  const threads = [...threadMap.entries()]
    .map(([id, threadMessages]) => {
      const sortedMessages = threadMessages.toSorted(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const latestMessage = sortedMessages.at(-1)!;
      const remoteActorMessage =
        sortedMessages.find((message) => message.actor.uri !== mainActor.actor.uri) ??
        sortedMessages[0]!;

      return {
        id,
        messages: sortedMessages,
        latestMessage,
        latestMessageAt: latestMessage.createdAt,
        recipientActor: remoteActorMessage.actor,
      };
    })
    .toSorted((a, b) => b.latestMessageAt.getTime() - a.latestMessageAt.getTime());

  const total = threads.length;
  const records = threads.slice((page - 1) * limit, page * limit);

  return { records, total };
}

export async function createDirectMessageReply(data: {
  parentId: string;
  recipientActorId: string;
  content: string;
  images?: File[];
}) {
  await getValidAdminSession();

  if (data.content.trim().length === 0) {
    throw new Error("Message content cannot be empty");
  }

  const uploadedImages: Array<{ url: string; mediaType: string }> = [];
  if (data.images && data.images.length > 0) {
    for (const image of data.images) {
      const imageUrl = await uploadFile(image, "direct-messages");
      uploadedImages.push({ url: imageUrl, mediaType: image.type });
    }
  }

  return await createDirectMessageReplyModel(
    data.parentId,
    data.recipientActorId,
    data.content,
    uploadedImages,
  );
}
