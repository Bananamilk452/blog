import {
  Actor,
  Create,
  Delete,
  Document,
  isActor,
  Mention,
  Note,
  PUBLIC_COLLECTION,
  Recipient,
  Update,
} from "@fedify/fedify";
import { Temporal } from "@js-temporal/polyfill";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

import { federation } from "~/federation";
import { Category, Image } from "~/generated/prisma";
import { prisma } from "~/lib/prisma";

import { isFollowersOnly, isNonList, isPublic } from "../utils-federation";
import { uploadFile } from "./s3";

export async function createPost(
  userId: string,
  data: {
    title: string;
    content: string;
    state: string;
    category?: string;
    slug?: string;
    banner?: File;
  },
) {
  const mainActor = await prisma.mainActor.findFirst({
    include: { actor: true },
  });

  if (!mainActor) {
    throw new Error("Main actor is not defined");
  }

  const username = mainActor.actor.username;

  const ctx = federation.createContext(
    new Request(process.env.PUBLIC_URL!),
    undefined,
  );

  const post = await prisma.$transaction(async (tx) => {
    let category: Category | null = null;
    let banner: Image | null = null;

    if (data.category) {
      category = await tx.category.upsert({
        where: { name: data.category },
        update: {},
        create: { name: data.category },
      });
    }

    if (data.banner) {
      const bannerUrl = await uploadFile(data.banner, "local-contents");
      banner = await tx.image.create({
        data: {
          url: bannerUrl,
          originalUrl: bannerUrl,
        },
      });
    }

    const post = await tx.posts.create({
      data: {
        // 임시 URI, 실제로는 federation이 생성한 URI로 업데이트할 예정입니다.
        uri: "https://localhost/",
        userId,
        actorId: mainActor.actor.id,
        title: data.title,
        content: data.content,
        state: data.state,
        categoryId: category ? category.id : undefined,
        slug: data.slug,
        bannerId: banner ? banner.id : undefined,
        publishedAt: data.state === "published" ? new Date() : null,
      },
    });

    const url = ctx.getObjectUri(Note, {
      slug: data.slug!,
    }).href;

    const updatedPost = await tx.posts.update({
      where: { id: post.id },
      data: { uri: url, url },
    });

    return updatedPost;
  });

  if (post.state === "published") {
    const noteArgs = { slug: data.slug! };
    const note = await ctx.getObject(Note, noteArgs);
    await ctx.sendActivity(
      { identifier: username },
      "followers",
      new Create({
        id: new URL("#activity", note?.id ?? undefined),
        object: note,
        actors: note?.attributionIds,
        tos: note?.toIds,
        ccs: note?.ccIds,
      }),
    );
  }

  return post;
}

export async function updatePost(
  postId: string,
  data: {
    title: string;
    content: string;
    state: string;
    category?: string;
    slug?: string;
    banner?: File;
  },
) {
  const mainActor = await prisma.mainActor.findFirst({
    include: { actor: true },
  });

  if (!mainActor) {
    throw new Error("Main actor is not defined");
  }

  const username = mainActor.actor.username;

  const ctx = federation.createContext(
    new Request(process.env.PUBLIC_URL!),
    undefined,
  );

  const existingPost = await prisma.posts.findFirst({
    where: { id: postId },
    include: { category: true, banner: true },
  });

  if (!existingPost) {
    throw new Error("Post not found");
  }

  const post = await prisma.$transaction(async (tx) => {
    let category: Category | null = null;
    let banner: Image | null = null;

    if (data.category && data.category !== existingPost?.category?.name) {
      category = await tx.category.upsert({
        where: { name: data.category },
        update: {},
        create: { name: data.category },
      });
    }

    if (data.banner) {
      const bannerUrl = await uploadFile(data.banner, "local-contents");
      banner = await tx.image.create({
        data: {
          url: bannerUrl,
          originalUrl: bannerUrl,
        },
      });
    }

    const updatedPost = await tx.posts.update({
      where: { id: existingPost.id },
      data: {
        title: data.title,
        content: data.content,
        state: data.state,
        categoryId: category ? category.id : undefined,
        slug: data.slug,
        bannerId: banner ? banner.id : existingPost.bannerId,
        publishedAt: data.state === "published" ? new Date() : null,
      },
    });

    return updatedPost;
  });

  if (post.state === "published") {
    const noteArgs = { slug: data.slug! };
    const note = await ctx.getObject(Note, noteArgs);
    await ctx.sendActivity(
      { identifier: username },
      "followers",
      new Update({
        id: new URL("#activity", note?.id ?? undefined),
        object: note,
        actors: note?.attributionIds,
        tos: note?.toIds,
        ccs: note?.ccIds,
      }),
    );
  }
  return post;
}

export async function deletePost(postId: string) {
  const ctx = federation.createContext(
    new Request(process.env.PUBLIC_URL!),
    undefined,
  );
  const mainActor = await prisma.mainActor.findFirst({
    include: { actor: true },
  });

  if (!mainActor) {
    throw new Error("Main actor is not defined");
  }

  const username = mainActor.actor.username;

  const deletedPost = await prisma.$transaction(async (tx) => {
    const post = await tx.posts.delete({ where: { id: postId } });

    if (post.state === "published") {
      const noteArgs = { slug: post.slug! };
      const note = await ctx.getObject(Note, noteArgs);
      await ctx.sendActivity(
        { identifier: username },
        "followers",
        new Delete({
          id: new URL("#activity", note?.id ?? undefined),
          object: note,
          actors: note?.attributionIds,
          tos: note?.toIds,
          ccs: note?.ccIds,
        }),
      );
    }

    return post;
  });

  return deletedPost;
}

export async function getPost(id: string, userId?: string) {
  const post = await prisma.posts.findUnique({
    where: { id },
    include: {
      user: true,
      category: true,
    },
  });

  if (!post) {
    return null;
  }

  if (post.state === "published") {
    return post;
  }

  if (post.state === "draft" && post.userId === userId) {
    return post;
  }

  return null;
}

export async function getPostBySlug(slug: string, userId?: string) {
  const post = await prisma.posts.findUnique({
    where: { slug },
    include: {
      user: {
        include: {
          avatar: true,
        },
      },
      banner: true,
      category: true,
    },
  });

  if (!post) {
    return null;
  }

  if (post.state === "published") {
    return post;
  }

  if (post.state === "draft" && post.userId === userId) {
    return post;
  }

  return null;
}

export async function getPosts(options?: {
  take?: number;
  skip?: number;
  include?: { draft?: boolean };
}) {
  const take = options?.take ?? 10;
  const skip = options?.skip ?? 0;
  const includeDraft = options?.include?.draft ?? false;

  const posts = await prisma.posts.findMany({
    where: includeDraft ? {} : { state: "published" },
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: {
      user: true,
      category: true,
      banner: true,
    },
  });

  const count = await prisma.posts.count({
    where: includeDraft ? {} : { state: "published" },
  });

  return { records: posts, total: count };
}

export async function getCategories() {
  return await prisma.category.findMany();
}

export async function getCommentsBySlug(slug: string) {
  const { id: postId } = await prisma.posts.findUniqueOrThrow({
    where: { slug },
    select: { id: true },
  });

  const comments = await prisma.comment.findMany({
    where: { postId },
    include: {
      attachment: true,
      actor: {
        include: {
          avatar: true,
        },
      },
      replies: {
        include: {
          attachment: true,
          actor: {
            include: {
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const mainActor = await prisma.mainActor.findFirst({
    include: { actor: true },
  });

  if (!mainActor) {
    throw new Error("Main actor is not defined");
  }

  const commentWithoutMainActor = comments.map((comment) => {
    return {
      ...comment,
      mentions: (comment.mentions as { href: string; name: string }[]).filter(
        (m) => m.href !== mainActor.actor.uri,
      ),
    };
  });

  return commentWithoutMainActor;
}

export async function createComment(
  actorId: string,
  data: {
    postId: string;
    parentId?: string;
    content: string;
    images?: Array<{ url: string; mediaType: string }>;
    mentions?: string[];
  },
) {
  // Convert markdown to HTML
  const htmlContent = await marked(data.content);

  // Sanitize HTML on server-side (defense-in-depth)
  const sanitizedContent = DOMPurify.sanitize(htmlContent);

  // Get post to verify it exists and get slug
  const post = await prisma.posts.findUniqueOrThrow({
    where: { id: data.postId },
    select: { slug: true, id: true },
  });

  // Get main actor for federation
  const mainActor = await prisma.mainActor.findFirst({
    include: { actor: true },
  });

  if (!mainActor) {
    throw new Error("Main actor is not defined");
  }

  const username = mainActor.actor.username;

  // Create federation context
  const ctx = federation.createContext(
    new Request(process.env.PUBLIC_URL!),
    undefined,
  );

  const mentions = data.content
    .split(/\s+/)
    .filter((word) => word.startsWith("@"));

  const mentionActors: Actor[] = [];

  for (const mention of mentions) {
    const actor = await ctx.lookupObject(mention);

    if (isActor(actor)) {
      mentionActors.push(actor);
    }
  }

  const comment = await prisma.$transaction(async (tx) => {
    // Prepare to/cc for storage
    const toRecipients: string[] = [];
    const ccRecipients: string[] = [];

    if (data.parentId) {
      const parentComment = await tx.comment.findUniqueOrThrow({
        where: { id: data.parentId },
        select: {
          to: true,
          cc: true,
          actor: { select: { uri: true } },
        },
      });

      if (isPublic(parentComment.to, parentComment.cc)) {
        toRecipients.push(PUBLIC_COLLECTION.href);
        ccRecipients.push(
          ctx.getFollowersUri(username).href,
          ...mentionActors.map((a) => a.url!.toString()),
        );
      } else if (isNonList(parentComment.to, parentComment.cc)) {
        toRecipients.push(
          ctx.getFollowersUri(username).href,
          ...mentionActors.map((a) => a.url!.toString()),
        );
        ccRecipients.push(PUBLIC_COLLECTION.href);
      } else if (isFollowersOnly(parentComment.to, parentComment.cc)) {
        toRecipients.push(ctx.getFollowersUri(username).href);
        ccRecipients.push(...mentionActors.map((a) => a.url!.toString()));
      }
    } else {
      // Reply to post
      const postActor = await tx.posts.findUnique({
        where: { id: data.postId },
        select: { actor: { select: { uri: true, username: true } } },
      });
      if (postActor) {
        toRecipients.push(postActor.actor.uri);
        ccRecipients.push(
          PUBLIC_COLLECTION.href,
          ctx.getFollowersUri(postActor.actor.username).href,
        );
      }
    }

    // Create comment with temporary URI
    const comment = await tx.comment.create({
      data: {
        uri: "https://localhost/",
        actorId,
        postId: data.postId,
        parentId: data.parentId ?? null,
        content: sanitizedContent,
        url: null,
        to: toRecipients,
        cc: ccRecipients,
        attachment:
          data.images && data.images.length > 0
            ? {
                createMany: {
                  data: data.images.map((img) => ({
                    url: img.url,
                    mediaType: img.mediaType,
                    sensitive: false,
                  })),
                },
              }
            : undefined,
        mentions: mentionActors.map((a) => ({
          href: a.url!.toString(),
          name: `@${a.preferredUsername}@${a.id?.hostname}`,
        })),
      },
    });

    // Generate proper URI for the comment using post slug + UUID
    const commentSlug = `${post.slug}-${crypto.randomUUID()}`;
    const commentUri = `${process.env.PUBLIC_URL}/post/${commentSlug}`;

    // Update with proper URI
    const updatedComment = await tx.comment.update({
      where: { id: comment.id },
      data: {
        uri: commentUri,
        url: commentUri,
      },
    });

    return updatedComment;
  });

  // Send ActivityPub Create activity to followers
  try {
    const noteArgs = { slug: comment.uri.split("/post/")[1] };
    const note = await ctx.getObject(Note, noteArgs);

    if (!note) {
      throw new Error("Failed to retrieve Note object for the post");
    }

    console.log(
      mentionActors,
      new Create({
        id: new URL("#activity", note?.id ?? undefined),
        actors: note?.attributionIds,
        tos: note?.toIds,
        ccs: note?.ccIds,
        object: new Note({
          id: new URL(comment.uri),
          attribution: new URL(mainActor.actor.uri),
          tos: note?.toIds,
          ccs: note?.ccIds,
          content: sanitizedContent,
          replyTarget: data.parentId
            ? await prisma.comment
                .findUnique({
                  where: { id: data.parentId },
                  select: { uri: true },
                })
                .then((c) => (c ? new URL(c.uri) : undefined))
            : new URL(`${process.env.PUBLIC_URL}/post/${post.slug}`),
          attachments: data.images?.map(
            (img) =>
              new Document({
                url: new URL(img.url),
                mediaType: img.mediaType,
              }),
          ),
          published: Temporal.Instant.from(comment.createdAt.toISOString()),
          tags: mentionActors.map(
            (actor) =>
              new Mention({
                href: actor.id,
                name: actor.preferredUsername,
              }),
          ),
        }),
      }),
    );

    await ctx.sendActivity(
      { identifier: username },
      mentionActors,
      new Create({
        id: new URL("#activity", note?.id ?? undefined),
        actors: note?.attributionIds,
        tos: note?.toIds,
        ccs: note?.ccIds,
        object: new Note({
          id: new URL(comment.uri),
          attribution: new URL(mainActor.actor.uri),
          tos: note?.toIds,
          ccs: note?.ccIds,
          content: sanitizedContent,
          replyTarget: data.parentId
            ? await prisma.comment
                .findUnique({
                  where: { id: data.parentId },
                  select: { uri: true },
                })
                .then((c) => (c ? new URL(c.uri) : undefined))
            : new URL(`${process.env.PUBLIC_URL}/post/${post.slug}`),
          attachments: data.images?.map(
            (img) =>
              new Document({
                url: new URL(img.url),
                mediaType: img.mediaType,
              }),
          ),
          published: Temporal.Instant.from(comment.createdAt.toISOString()),
          tags: mentionActors.map(
            (actor) =>
              new Mention({
                href: actor.id,
                name: actor.preferredUsername,
              }),
          ),
        }),
      }),
    );
  } catch (error) {
    // Log federation errors but don't fail the comment creation
    console.error("Failed to send Create activity for comment:", error);
  }

  return comment;
}
