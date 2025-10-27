import { Create, Note } from "@fedify/fedify";

import { federation } from "~/federation";
import { prisma } from "~/lib/prisma";

export async function createPost(
  userId: string,
  data: { title: string; content: string; state: string },
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
    const post = await tx.posts.create({
      data: {
        // 임시 URI, 실제로는 federation이 생성한 URI로 업데이트할 예정입니다.
        uri: "https://localhost/",
        userId,
        actorId: mainActor.actor.id,
        title: data.title,
        content: data.content,
        state: data.state,
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
    },
  });

  if (!post) {
    return null;
  }

  if (post.state === "published") {
    return post;
  }

  return null;
}
