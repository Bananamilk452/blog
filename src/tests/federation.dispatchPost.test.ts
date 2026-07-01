import { Article, PUBLIC_COLLECTION } from "@fedify/fedify";

import { createCtx, mocks } from "./federation.helpers";

const { dispatchPost } = await import("../federation/dispatchPost");

describe("dispatchPost", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dispatches a public blog post Article", async () => {
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

    const article = await dispatchPost(createCtx(), { slug: "hello" });

    expect(article).toBeInstanceOf(Article);
    expect(article?.id?.href).toBe("https://example.com/post/hello");
    expect(article?.toIds.map((url) => url.href)).toContain(PUBLIC_COLLECTION.href);
    expect(article?.ccIds.map((url) => url.href)).toContain(
      "https://example.com/users/alice/followers",
    );
  });

  it("returns null for unknown posts", async () => {
    mocks.prisma.posts.findFirst.mockResolvedValueOnce(null);

    await expect(dispatchPost(createCtx(), { slug: "missing" })).resolves.toBeNull();
  });
});
