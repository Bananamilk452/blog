import { QuoteAuthorization } from "@fedify/vocab";

import { createCtx } from "./federation.helpers";

const { dispatchQuoteAuthorization, getQuoteAuthorizationUri } =
  await import("../federation/quoteAuthorization");

describe("quoteAuthorization", () => {
  it("dispatches deterministic QuoteAuthorization stamp URLs", async () => {
    const ctx = createCtx();
    const payload = {
      attributedTo: "https://example.com/users/alice",
      interactingObject: "https://remote.test/users/bob/statuses/1",
      interactionTarget: "https://example.com/post/hello",
    };
    const uri = getQuoteAuthorizationUri(ctx, payload);
    const stamp = uri.pathname.split("/").at(-1);

    expect(stamp).toBeTruthy();

    const authorization = await dispatchQuoteAuthorization(ctx, { stamp: stamp! });

    expect(authorization).toBeInstanceOf(QuoteAuthorization);
    expect(authorization?.id?.href).toBe(uri.href);
    expect(authorization?.attributionId?.href).toBe(payload.attributedTo);
    expect(authorization?.interactingObjectId?.href).toBe(payload.interactingObject);
    expect(authorization?.interactionTargetId?.href).toBe(payload.interactionTarget);
  });
});
