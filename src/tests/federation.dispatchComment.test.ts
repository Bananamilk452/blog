import { Document, Note, PUBLIC_COLLECTION } from "@fedify/fedify";

import { createCtx, mocks } from "./federation.helpers";

const { dispatchComment } = await import("../federation/dispatchComment");

describe("dispatchComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dispatches a comment Note by UUID slug", async () => {
    const createdAt = new Date("2026-01-02T00:00:00.000Z");
    const slug = "11111111-1111-4111-8111-111111111111";
    mocks.prisma.comment.findFirst.mockResolvedValueOnce({
      uri: `https://example.com/post/${slug}`,
      actor: { uri: "https://remote.test/users/bob" },
      to: [PUBLIC_COLLECTION.href],
      cc: ["https://remote.test/users/bob/followers"],
      mentions: [{ href: "https://example.com/users/alice", name: "@alice@example.com" }],
      content: "<p>Hello</p>",
      parent: null,
      post: { uri: "https://example.com/post/hello" },
      attachment: [{ url: "https://remote.test/image.png", mediaType: "image/png" }],
      createdAt,
      url: null,
    });

    const note = await dispatchComment(createCtx(), { slug });
    const attachments = [];
    for await (const attachment of note?.getAttachments() ?? []) {
      attachments.push(attachment);
    }

    expect(note).toBeInstanceOf(Note);
    expect(note?.id?.href).toBe(`https://example.com/post/${slug}`);
    expect(note?.replyTargetId?.href).toBe("https://example.com/post/hello");
    expect(
      attachments
        .filter((attachment): attachment is Document => attachment instanceof Document)
        .map((attachment) => attachment.url?.href),
    ).toEqual(["https://remote.test/image.png"]);
  });

  it("returns null when dispatching an unknown comment", async () => {
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);

    await expect(
      dispatchComment(createCtx(), { slug: "11111111-1111-4111-8111-111111111111" }),
    ).resolves.toBeNull();
  });
});
