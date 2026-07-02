import {
  InteractionPolicy,
  InteractionRule,
  PUBLIC_COLLECTION,
  QuoteAuthorization,
} from "@fedify/vocab";

import type { Context, RequestContext } from "@fedify/fedify";

type QuoteAuthorizationPayload = {
  attributedTo: string;
  interactingObject: string;
  interactionTarget: string;
};

export function createQuoteInteractionPolicy() {
  return new InteractionPolicy({
    canQuote: new InteractionRule({
      automaticApproval: PUBLIC_COLLECTION,
    }),
  });
}

export function createQuoteAuthorization(payload: QuoteAuthorizationPayload, id?: URL) {
  return new QuoteAuthorization({
    id,
    attribution: new URL(payload.attributedTo),
    interactingObject: new URL(payload.interactingObject),
    interactionTarget: new URL(payload.interactionTarget),
  });
}

export function getQuoteAuthorizationUri(
  ctx: Context<unknown>,
  payload: QuoteAuthorizationPayload,
) {
  return ctx.getObjectUri(QuoteAuthorization, { stamp: encodeQuoteAuthorizationPayload(payload) });
}

export async function dispatchQuoteAuthorization(
  ctx: RequestContext<unknown>,
  values: { stamp: string },
) {
  const payload = decodeQuoteAuthorizationPayload(values.stamp);
  if (payload == null) return null;

  return createQuoteAuthorization(payload, ctx.getObjectUri(QuoteAuthorization, values));
}

function encodeQuoteAuthorizationPayload(payload: QuoteAuthorizationPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeQuoteAuthorizationPayload(stamp: string): QuoteAuthorizationPayload | null {
  try {
    const payload = JSON.parse(Buffer.from(stamp, "base64url").toString("utf8"));
    if (!isQuoteAuthorizationPayload(payload)) return null;

    return payload;
  } catch {
    return null;
  }
}

function isQuoteAuthorizationPayload(value: unknown): value is QuoteAuthorizationPayload {
  if (typeof value !== "object" || value == null) return false;

  const payload = value as Partial<QuoteAuthorizationPayload>;
  return (
    isUrlString(payload.attributedTo) &&
    isUrlString(payload.interactingObject) &&
    isUrlString(payload.interactionTarget)
  );
}

function isUrlString(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
