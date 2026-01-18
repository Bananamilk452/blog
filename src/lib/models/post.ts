import { Create, Delete, Note, Update } from "@fedify/fedify";

import { federation } from "~/federation";
import { Category, Image } from "~/generated/prisma";
import { prisma } from "~/lib/prisma";

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

  return await prisma.comment.findMany({
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
}
