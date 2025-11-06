import { getUser, updateUser } from "../models/user";

export class UserService {
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async getUser() {
    return await getUser(this.userId);
  }

  async updateUser(data: Parameters<typeof updateUser>[1]) {
    return await updateUser(this.userId, data);
  }
}
