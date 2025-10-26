import { createPost } from "~/lib/models/post";

export class PostService {
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async createPost(data: { title: string; content: string }) {
    if (data.content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }

    const post = await createPost(this.userId, data);
    return post;
  }
}
