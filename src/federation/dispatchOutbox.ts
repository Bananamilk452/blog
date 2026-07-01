import { Article, Create } from "@fedify/fedify";

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

        const article = await ctx.getObject(Article, { slug: post.slug });
        if (!article) return null;

        return new Create({
          id: new URL("#activity", article.id ?? undefined),
          actors: article.attributionIds,
          tos: article.toIds,
          ccs: article.ccIds,
          object: article,
        });
      }),
    )
  ).filter((item) => item != null);

  return { items };
}
