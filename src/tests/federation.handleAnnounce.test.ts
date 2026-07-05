import { Announce } from "@fedify/vocab";

import { createCtx, createRemoteActor, mocks } from "./federation.helpers";

const { handleAnnounce } = await import("../federation/handleAnnounce");

describe("handleAnnounce", () => {
  beforeEach(() => vi.clearAllMocks());

  it("handles a remote Announce for a local post", async () => {
    const actor = createRemoteActor();
    const announce = new Announce({
      id: new URL("https://remote.test/activities/announce-1"),
      actor: actor.id,
      object: new URL("https://example.com/post/hello"),
    });
    vi.spyOn(announce, "getActor").mockResolvedValue(actor);
    mocks.prisma.posts.findFirst.mockResolvedValueOnce({ id: "post-1" });
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor" });

    await expect(handleAnnounce(createCtx(), announce)).resolves.toBe("handled");

    expect(mocks.upsertActor).toHaveBeenCalledWith(actor);
  });

  it("ignores an Announce when the target is not local", async () => {
    const actor = createRemoteActor();
    const announce = new Announce({
      id: new URL("https://remote.test/activities/announce-1"),
      actor: actor.id,
      object: new URL("https://remote.test/notes/1"),
    });
    vi.spyOn(announce, "getActor").mockResolvedValue(actor);
    mocks.prisma.posts.findFirst.mockResolvedValueOnce(null);
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);

    await expect(handleAnnounce(createCtx(), announce)).resolves.toBe("ignored");

    expect(mocks.upsertActor).not.toHaveBeenCalled();
  });
});
