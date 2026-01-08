import {
  createPost,
  deletePost,
  getCategories,
  getPost,
  getPostBySlug,
  getPosts,
  updatePost,
} from "~/lib/models/post";
import { requireUserId } from "~/lib/utils-server";

export class PostService {
  userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  @requireUserId
  async createPost(data: Parameters<typeof createPost>[1]) {
    if (data.content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }

    const post = await createPost(this.userId!, data);
    return post;
  }

  @requireUserId
  async updatePost(id: string, data: Parameters<typeof updatePost>[1]) {
    if (data.content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }

    const existingPost = await getPost(id, this.userId);
    if (!existingPost || existingPost.userId !== this.userId) {
      throw new Error(
        "Post not found or you do not have permission to edit it",
      );
    }

    const post = await updatePost(id, data);
    return post;
  }

  @requireUserId
  async deletePost(id: string) {
    const existingPost = await getPost(id, this.userId);
    if (!existingPost || existingPost.userId !== this.userId) {
      throw new Error(
        "Post not found or you do not have permission to delete it",
      );
    }

    const deletedPost = await deletePost(id);

    return deletedPost;
  }

  async getPost(id: string) {
    return await getPost(id, this.userId);
  }

  async getPostBySlug(slug: string) {
    return await getPostBySlug(slug, this.userId);
  }

  async getPosts(options?: {
    page?: number;
    limit?: number;
    include?: { draft?: boolean };
  }) {
    const take = options?.limit ?? 10;
    const skip = options?.page ? (options.page - 1) * take : 0;

    return await getPosts({ ...options, skip, take });
  }

  async getCategories() {
    return await getCategories();
  }
}
