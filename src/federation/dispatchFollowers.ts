import { prisma } from "~/lib/prisma";
import { federationLog as log } from "~/lib/server-log";

import type { Context } from "@fedify/fedify";
import type { Recipient } from "@fedify/vocab";

export async function dispatchFollowers(_ctx: Context<unknown>, identifier: string) {
  log(`Dispatching followers for identifier: ${identifier}`);

  const followers = await prisma.follows.findMany({
    where: {
      following: {
        user: {
          username: identifier,
        },
      },
    },
    include: {
      follower: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const items: Recipient[] = followers.map((f) => ({
    id: new URL(f.follower.uri),
    inboxId: new URL(f.follower.inboxUrl),
    endpoints:
      f.follower.sharedInboxUrl == null
        ? null
        : { sharedInbox: new URL(f.follower.sharedInboxUrl) },
  }));

  return { items };
}
