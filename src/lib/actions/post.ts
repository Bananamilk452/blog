"use server";

import { PostService } from "../services/post";
import { getOptionalSession, getValidSession } from "../utils-server";

export async function createPost(data: { title: string; content: string }) {
  const session = await getValidSession();

  const postService = new PostService(session.user.id);

  return await postService.createPost(data);
}

export async function getPost(id: string) {
  const session = await getOptionalSession();

  const postService = new PostService(session?.user.id);

  return await postService.getPost(id);
}
