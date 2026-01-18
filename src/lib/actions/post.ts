"use server";

import { PostService } from "../services/post";
import { getOptionalSession, getValidAdminSession } from "../utils-server";
import { uploadFile } from "./s3";

export async function createPost(
  data: Parameters<typeof PostService.prototype.createPost>[0],
) {
  const session = await getValidAdminSession();

  const postService = new PostService(session.user.id);

  return await postService.createPost(data);
}

export async function updatePost(
  id: string,
  data: Parameters<typeof PostService.prototype.updatePost>[1],
) {
  const session = await getValidAdminSession();

  const postService = new PostService(session.user.id);

  return await postService.updatePost(id, data);
}

export async function deletePost(id: string) {
  const session = await getValidAdminSession();

  const postService = new PostService(session.user.id);

  return await postService.deletePost(id);
}

export async function getPost(id: string) {
  const session = await getOptionalSession();

  const postService = new PostService(session?.user.id);

  return await postService.getPost(id);
}

export async function getPostBySlug(slug: string) {
  const session = await getOptionalSession();

  const postService = new PostService(session?.user.id);

  return await postService.getPostBySlug(slug);
}

export async function getPosts(
  options: Parameters<typeof PostService.prototype.getPosts>[0],
) {
  const session = await getOptionalSession();

  if (session?.user.role !== "admin" && options?.include?.draft) {
    throw new Error("Unauthorized");
  }

  const postService = new PostService(session?.user.id);

  return await postService.getPosts(options);
}

export async function getCategories() {
  const postService = new PostService();

  return await postService.getCategories();
}

export async function getCommentsBySlug(slug: string) {
  const session = await getOptionalSession();

  const postService = new PostService(session?.user.id);

  return await postService.getCommentsBySlug(slug);
}

export async function createComment(data: {
  postId: string;
  parentId?: string;
  content: string;
  images?: File[];
}) {
  const session = await getValidAdminSession();

  const postService = new PostService(session.user.id);

  // Upload all images to S3
  const uploadedImages: Array<{ url: string; mediaType: string }> = [];
  if (data.images && data.images.length > 0) {
    for (const image of data.images) {
      const imageUrl = await uploadFile(image, "comments");
      uploadedImages.push({
        url: imageUrl,
        mediaType: image.type,
      });
    }
  }

  return await postService.createComment({
    postId: data.postId,
    parentId: data.parentId,
    content: data.content,
    images: uploadedImages.length > 0 ? uploadedImages : undefined,
  });
}
