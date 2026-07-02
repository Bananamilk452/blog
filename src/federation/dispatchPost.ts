import { Document, Note, PUBLIC_COLLECTION } from "@fedify/vocab";
import { Temporal } from "@js-temporal/polyfill";
import { format } from "date-fns";

import { createQuoteInteractionPolicy } from "./quoteAuthorization";
import { prisma } from "~/lib/prisma";

import type { RequestContext } from "@fedify/fedify";

export async function dispatchPost(ctx: RequestContext<unknown>, values: { slug: string }) {
  const post = await prisma.posts.findFirst({
    where: {
      slug: values.slug,
    },
    include: {
      user: true,
      banner: true,
      actor: true,
    },
  });

  if (!post) return null;

  const content = `<a href="${post.uri}">${post.title}</a> (작성자: ${post.user.name} - 마지막 수정 ${format(post.updatedAt, "yyyy/MM/dd")})<br />${post.content}`;

  return new Note({
    id: ctx.getObjectUri(Note, values),
    attribution: ctx.getActorUri(post.actor.username),
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(post.actor.username),
    content,
    mediaType: "text/html",
    interactionPolicy: createQuoteInteractionPolicy(),
    published: Temporal.Instant.from(
      post.publishedAt ? post.publishedAt.toISOString() : post.createdAt.toISOString(),
    ),
    url: ctx.getObjectUri(Note, values),
    attachments: post.banner
      ? [
          new Document({
            url: new URL(post.banner.url),
          }),
        ]
      : undefined,
  });
}
