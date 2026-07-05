import { prisma } from "~/lib/prisma";
import { federationLog as log } from "~/lib/server-log";

import type { RequestContext } from "@fedify/fedify";

export async function countFollowers(_ctx: RequestContext<unknown>, identifier: string) {
  log(`Counting followers for identifier: ${identifier}`);

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
