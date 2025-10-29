"use server";

import { PostService } from "../services/post";
import { getOptionalSession, getValidAdminSession } from "../utils-server";

export async function createPost(data: {
  title: string;
  content: string;
  state: string;
  category: string;
}) {
  const session = await getValidAdminSession();

  const postService = new PostService(session.user.id);

  return await postService.createPost(data);
}

export async function getPost(id: string) {
  const session = await getOptionalSession();

  const postService = new PostService(session?.user.id);

  return await postService.getPost(id);
}

export async function getCategories() {
  const postService = new PostService();

  return await postService.getCategories();
}
