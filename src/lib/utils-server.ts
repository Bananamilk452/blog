import "server-only";

import { headers } from "next/headers";

import { auth } from "./auth";

export async function getValidSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new Error("Not logged in");
  }

  return session;
}
