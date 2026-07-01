import "server-only";
import ky from "ky";
import { headers } from "next/headers";

import { auth } from "./auth";
import { MAX_DOWNLOAD_SIZE } from "~/constants";

export async function getValidSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new Error("Not logged in");
  }

  return session;
}

export async function getValidAdminSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new Error("Not logged in");
  }

  if (session.user.role !== "admin") {
    throw new Error("Not authorized");
  }

  return session;
}

export async function getOptionalSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

export function requireUserId<This extends { userId?: unknown }, Args extends unknown[], Return>(
  target: unknown,
  propertyKey: unknown,
  descriptor?: TypedPropertyDescriptor<(this: This, ...args: Args) => Return>,
) {
  if (!descriptor?.value) {
    throw new Error("Descriptor not found");
  }

  const originalMethod = descriptor.value;

  descriptor.value = async function (this: This, ...args: Args) {
    if (!this.userId) {
      throw new Error("User ID is required to perform this action.");
    }
    return await originalMethod.apply(this, args);
  } as unknown as typeof originalMethod;
}

export async function downloadFile(url: string) {
  const { headers } = await ky.head(url);
  const contentLength = headers.get("content-length");

  if (contentLength && Number(contentLength) > MAX_DOWNLOAD_SIZE) {
    throw new Error("File size exceeds the maximum limit.");
  }

  const response = await ky.get(url);
  return await response.arrayBuffer();
}
