import { createPost } from "~/lib/models/post";

export class PostService {
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async createPost(content: string) {
    if (content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }

    const post = await createPost(this.userId, content);
    return post;
  }
}
