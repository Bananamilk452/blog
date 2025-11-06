"use server";

import { UserService } from "../services/user";
import { getValidSession } from "../utils-server";

export async function getUser() {
  const session = await getValidSession();

  const userService = new UserService(session.user.id);

  return await userService.getUser();
}

export async function updateUser(
  data: Parameters<UserService["updateUser"]>[0],
) {
  const session = await getValidSession();

  const userService = new UserService(session.user.id);

  return await userService.updateUser(data);
}
