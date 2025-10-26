"use server";

import { PostService } from "../services/post";
import { getValidSession } from "../utils-server";

export async function createPost(data: { title: string; content: string }) {
  const session = await getValidSession();

  const postService = new PostService(session.user.id);

  return await postService.createPost(data);
}
