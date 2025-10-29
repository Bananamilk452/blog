import {
  createPost,
  getCategories,
  getPost,
  getPosts,
} from "~/lib/models/post";
import { requireUserId } from "~/lib/utils-server";

export class PostService {
  userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  @requireUserId
  async createPost(data: {
    title: string;
    content: string;
    state: string;
    category: string;
  }) {
    if (data.content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }

    const post = await createPost(this.userId!, data);
    return post;
  }

  async getPost(id: string) {
    return await getPost(id, this.userId);
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
