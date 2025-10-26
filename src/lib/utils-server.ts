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

export async function getOptionalSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

export function requireUserId(
  target: unknown,
  propertyKey: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descriptor?: TypedPropertyDescriptor<any>,
) {
  if (!descriptor) {
    throw new Error("Descriptor not found");
  }

  const originalMethod = descriptor.value;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descriptor.value = async function (this: any, ...args: any[]) {
    if (!this.userId) {
      throw new Error("User ID is required to perform this action.");
    }
    return await originalMethod.apply(this, args);
  };
}
