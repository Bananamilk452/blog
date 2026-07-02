import { Note, PUBLIC_COLLECTION } from "@fedify/vocab";

import { createCtx, mocks } from "./federation.helpers";

const { dispatchPost } = await import("../federation/dispatchPost");

describe("dispatchPost", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dispatches a public blog post Note", async () => {
    const date = new Date("2026-01-02T00:00:00.000Z");
    mocks.prisma.posts.findFirst.mockResolvedValueOnce({
      uri: "https://example.com/post/hello",
      title: "Hello",
      content: "<p>Body</p>",
      updatedAt: date,
      createdAt: date,
      publishedAt: date,
      user: { name: "Alice" },
      actor: { username: "alice" },
      banner: { url: "https://example.com/banner.png" },
    });

    const note = await dispatchPost(createCtx(), { slug: "hello" });

    expect(note).toBeInstanceOf(Note);
    expect(note?.id?.href).toBe("https://example.com/post/hello");
    expect(note?.toIds.map((url) => url.href)).toContain(PUBLIC_COLLECTION.href);
    expect(note?.ccIds.map((url) => url.href)).toContain(
      "https://example.com/users/alice/followers",
    );

    const json = (await note?.toJsonLd()) as {
      interactionPolicy?: { canQuote?: { automaticApproval?: string } };
    };
    expect(json.interactionPolicy?.canQuote?.automaticApproval).toBe("as:Public");
  });

  it("returns null for unknown posts", async () => {
    mocks.prisma.posts.findFirst.mockResolvedValueOnce(null);

    await expect(dispatchPost(createCtx(), { slug: "missing" })).resolves.toBeNull();
  });
});
