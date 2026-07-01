import { log } from "./log";
import { prisma } from "~/lib/prisma";

import type { RequestContext } from "@fedify/fedify";

export async function countOutboxItems(_ctx: RequestContext<unknown>, identifier: string) {
  log(`Counting outbox items for identifier: ${identifier}`);

  return await prisma.posts.count({
    where: {
      state: "published",
      slug: { not: null },
      actor: {
        username: identifier,
        userId: { not: null },
      },
    },
  });
}
