import { Emoji, EmojiReact, Image, Like } from "@fedify/fedify";

import { createCtx, createRemoteActor, mocks } from "./federation.helpers";

const { handleReaction } = await import("../federation/handleReaction");

describe("handleReaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves a remote Like as a heart reaction", async () => {
    const actor = createRemoteActor();
    const like = new Like({
      id: new URL("https://remote.test/activities/like-1"),
      actor: actor.id,
      object: new URL("https://example.com/post/hello"),
      tos: [new URL("https://example.com/users/alice")],
    });
    vi.spyOn(like, "getActor").mockResolvedValue(actor);
    mocks.prisma.posts.findFirst.mockResolvedValueOnce({ id: "post-1" });
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor" });

    await expect(handleReaction(createCtx(), like)).resolves.toBe("handled");

    expect(mocks.prisma.reaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        uri: "https://remote.test/activities/like-1",
        activityType: "Like",
        content: "❤️",
        actorId: "remote-actor",
        postId: "post-1",
        targetUri: "https://example.com/post/hello",
      }),
    });
  });

  it("saves a remote EmojiReact with custom emoji metadata", async () => {
    const actor = createRemoteActor();
    const emojiReact = new EmojiReact({
      id: new URL("https://remote.test/activities/react-1"),
      actor: actor.id,
      object: new URL("https://example.com/post/hello"),
      content: ":blobcat:",
      tags: [
        new Emoji({
          name: ":blobcat:",
          icon: new Image({
            url: new URL("https://remote.test/blobcat.png"),
            mediaType: "image/png",
          }),
        }),
      ],
    });
    vi.spyOn(emojiReact, "getActor").mockResolvedValue(actor);
    mocks.prisma.posts.findFirst.mockResolvedValueOnce({ id: "post-1" });
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor" });

    await expect(handleReaction(createCtx(), emojiReact)).resolves.toBe("handled");

    expect(mocks.prisma.reaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        activityType: "EmojiReact",
        content: ":blobcat:",
        emojiName: ":blobcat:",
        emojiIconUrl: "https://remote.test/blobcat.png",
        emojiIconMediaType: "image/png",
      }),
    });
  });

  it("ignores duplicate reactions", async () => {
    const actor = createRemoteActor();
    const emojiReact = new EmojiReact({
      id: new URL("https://remote.test/activities/react-1"),
      actor: actor.id,
      object: new URL("https://example.com/post/hello"),
      content: "🔥",
    });
    vi.spyOn(emojiReact, "getActor").mockResolvedValue(actor);
    mocks.prisma.posts.findFirst.mockResolvedValueOnce({ id: "post-1" });
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor" });
    mocks.prisma.reaction.create.mockRejectedValueOnce({ code: "P2002" });

    await expect(handleReaction(createCtx(), emojiReact)).resolves.toBe("ignored");
  });
});
