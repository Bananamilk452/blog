import { Create, Note } from "@fedify/fedify";

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

  const username = mainActor.actor.handle;

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
      },
    });

    const url = ctx.getObjectUri(Note, {
      identifier: username,
      id: post.id,
    }).href;

    const updatedPost = await tx.posts.update({
      where: { id: post.id },
      data: { uri: url, url },
    });

    return updatedPost;
  });

  if (post.state === "published") {
    const noteArgs = { identifier: username, id: post.id.toString() };
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
