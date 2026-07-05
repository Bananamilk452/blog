import { Accept } from "@fedify/vocab";

import { createQuoteAuthorization, getQuoteAuthorizationUri } from "./quoteAuthorization";
import { prisma } from "~/lib/prisma";
import { federationLog as log } from "~/lib/server-log";

import type { InboxActivityStatus } from "./logInboxActivity";
import type { InboxContext } from "@fedify/fedify";
import type { QuoteRequest } from "@fedify/vocab";

export async function handleQuoteRequest(
  ctx: InboxContext<unknown>,
  quoteRequest: QuoteRequest,
): Promise<InboxActivityStatus> {
  log(`Received QuoteRequest activity: ${quoteRequest.id?.href}`);

  if (quoteRequest.actorId == null || quoteRequest.objectId == null) return "ignored";

  const quotePostId = await getQuotePostId(quoteRequest);
  if (quotePostId == null) {
    log("The QuoteRequest does not have an identifiable instrument:", quoteRequest);
    return "ignored";
  }

  const quotedObjectUri = quoteRequest.objectId.href;
  const quotedObjectAuthor = await findLocalObjectAuthor(quotedObjectUri);
  if (quotedObjectAuthor == null) {
    log(`QuoteRequest target is not a local object: ${quotedObjectUri}`);
    return "ignored";
  }

  const quoteActor = await quoteRequest.getActor();
  if (quoteActor?.id == null || quoteActor.inboxId == null) {
    log("The QuoteRequest actor is not deliverable:", quoteRequest);
    return "ignored";
  }

  const authorizationPayload = {
    attributedTo: quotedObjectAuthor.uri,
    interactingObject: quotePostId.href,
    interactionTarget: quotedObjectUri,
  };
  const authorizationUri = getQuoteAuthorizationUri(ctx, authorizationPayload);

  await ctx.sendActivity(
    { identifier: quotedObjectAuthor.username },
    quoteActor,
    new Accept({
      actor: new URL(quotedObjectAuthor.uri),
      to: quoteRequest.actorId,
      object: quoteRequest,
      result: createQuoteAuthorization(authorizationPayload, authorizationUri),
    }),
    { immediate: true },
  );

  return "handled";
}

async function getQuotePostId(quoteRequest: QuoteRequest) {
  if (quoteRequest.instrumentId != null) return quoteRequest.instrumentId;

  const instrument = await quoteRequest.getInstrument();
  return instrument?.id ?? null;
}

async function findLocalObjectAuthor(uri: string) {
  const post = await prisma.posts.findFirst({
    where: { uri },
    include: { actor: true },
  });
  if (post?.actor.userId != null) return post.actor;

  const comment = await prisma.comment.findFirst({
    where: { uri },
    include: { actor: true },
  });
  return comment?.actor.userId == null ? null : comment.actor;
}
