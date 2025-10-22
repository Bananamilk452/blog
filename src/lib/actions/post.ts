"use server";

import { prisma } from "../prisma";
import { PostService } from "../services/post";
import { getValidSession } from "../utils-server";

export async function createPost(content: string) {
  // TODO: 임시 코드
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("Cannot find user");
  }
  const postService = new PostService(user.id);

  // TODO: 나중에 아래 코드로 변경
  // const session = await getValidSession();

  // const postService = new PostService(session.user.id);

  return await postService.createPost(content);
}
