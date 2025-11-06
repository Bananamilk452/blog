import { getUser } from "../models/user";

export class UserService {
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async getUser() {
    return await getUser(this.userId);
  }
}
