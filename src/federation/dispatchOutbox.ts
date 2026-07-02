import { Create, Note } from "@fedify/vocab";

import { log } from "./log";
import { prisma } from "~/lib/prisma";

import type { RequestContext } from "@fedify/fedify";

export async function dispatchOutbox(ctx: RequestContext<unknown>, identifier: string) {
  log(`Dispatching outbox for identifier: ${identifier}`);

  const posts = await prisma.posts.findMany({
    where: {
      state: "published",
      slug: { not: null },
      actor: {
        username: identifier,
        userId: { not: null },
      },
    },
    orderBy: { publishedAt: "desc" },
    select: { slug: true },
  });

  const items = (
    await Promise.all(
      posts.map(async (post) => {
        if (post.slug == null) return null;

        const note = await ctx.getObject(Note, { slug: post.slug });
        if (!note) return null;

        return new Create({
          id: new URL("#activity", note.id ?? undefined),
          actors: note.attributionIds,
          tos: note.toIds,
          ccs: note.ccIds,
          object: note,
        });
      }),
    )
  ).filter((item) => item != null);

  return { items };
}
