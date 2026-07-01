import { prisma } from "~/lib/prisma";

import type { RequestContext } from "@fedify/fedify";

export async function countFollowers(_ctx: RequestContext<unknown>, identifier: string) {
  return await prisma.follows.count({
    where: {
      following: {
        user: {
          username: identifier,
        },
      },
    },
  });
}
