import { Document, Mention, Note } from "@fedify/fedify";
import { Temporal } from "@js-temporal/polyfill";

import { prisma } from "~/lib/prisma";

import type { RequestContext } from "@fedify/fedify";

export async function dispatchComment(ctx: RequestContext<unknown>, values: { slug: string }) {
  const commentUri = ctx.getObjectUri(Note, values).href;
  const comment = await prisma.comment.findFirst({
    where: { uri: commentUri },
    include: {
      actor: true,
      attachment: true,
      post: true,
      parent: {
        select: {
          uri: true,
        },
      },
    },
  });

  if (!comment) return null;

  return new Note({
    id: new URL(comment.uri),
    attribution: new URL(comment.actor.uri),
    tos: comment.to.map((uri) => new URL(uri)),
    ccs: comment.cc.map((uri) => new URL(uri)),
    tags: (comment.mentions as { href: string; name: string }[]).map(
      (mention) =>
        new Mention({
          id: new URL(mention.href),
          name: mention.name,
        }),
    ),
    content: comment.content,
    mediaType: "text/html",
    replyTarget: comment.parent ? new URL(comment.parent.uri) : new URL(comment.post.uri),
    attachments: comment.attachment.map(
      (att) =>
        new Document({
          url: new URL(att.url),
          mediaType: att.mediaType ?? undefined,
        }),
    ),
    published: Temporal.Instant.from(comment.createdAt.toISOString()),
    url: new URL(comment.url ?? comment.uri),
  });
}
