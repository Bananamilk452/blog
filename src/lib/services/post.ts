import { createPost, getPost } from "~/lib/models/post";
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
    slug: string;
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
}
