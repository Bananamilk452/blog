import { Accept, Note, QuoteAuthorization, QuoteRequest } from "@fedify/vocab";

import { createCtx, createRemoteActor, mocks } from "./federation.helpers";

const { handleQuoteRequest } = await import("../federation/handleQuoteRequest");

describe("handleQuoteRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("always accepts QuoteRequest activities for local posts", async () => {
    const ctx = createCtx();
    const quoteActor = createRemoteActor();
    const quotedObject = new URL("https://example.com/post/hello");
    const quotePost = new URL("https://remote.test/users/bob/statuses/1");
    const quoteRequest = new QuoteRequest({
      id: new URL("https://remote.test/activities/quote-request-1"),
      actor: quoteActor.id,
      object: quotedObject,
      instrument: new Note({
        id: quotePost,
        attribution: quoteActor.id,
        quote: quotedObject,
        content: "quoting this",
      }),
    });
    vi.spyOn(quoteRequest, "getActor").mockResolvedValue(quoteActor);
    mocks.prisma.posts.findFirst.mockResolvedValueOnce({
      actor: {
        uri: "https://example.com/users/alice",
        username: "alice",
        userId: "local-user",
      },
    });

    await expect(handleQuoteRequest(ctx, quoteRequest)).resolves.toBe("handled");

    expect(ctx.sendActivity).toHaveBeenCalledTimes(1);
    expect(ctx.sendActivity.mock.calls[0][0]).toEqual({ identifier: "alice" });
    expect(ctx.sendActivity.mock.calls[0][1]).toBe(quoteActor);

    const accept = ctx.sendActivity.mock.calls[0][2] as Accept;
    expect(accept).toBeInstanceOf(Accept);
    expect(accept.actorId?.href).toBe("https://example.com/users/alice");
    expect(accept.toIds.map((to) => to.href)).toEqual([quoteActor.id?.href]);

    const result = await accept.getResult();
    expect(result).toBeInstanceOf(QuoteAuthorization);
    expect(result?.id?.href).toContain("https://example.com/quote-authorizations/");
    expect(result?.attributionId?.href).toBe("https://example.com/users/alice");
    expect((result as QuoteAuthorization).interactingObjectId?.href).toBe(quotePost.href);
    expect((result as QuoteAuthorization).interactionTargetId?.href).toBe(quotedObject.href);
  });

  it("ignores QuoteRequests for unknown local objects", async () => {
    const ctx = createCtx();
    const quoteActor = createRemoteActor();
    const quoteRequest = new QuoteRequest({
      actor: quoteActor.id,
      object: new URL("https://example.com/post/missing"),
      instrument: new URL("https://remote.test/users/bob/statuses/1"),
    });
    mocks.prisma.posts.findFirst.mockResolvedValueOnce(null);
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);

    await expect(handleQuoteRequest(ctx, quoteRequest)).resolves.toBe("ignored");

    expect(ctx.sendActivity).not.toHaveBeenCalled();
  });
});
