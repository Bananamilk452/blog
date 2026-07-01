import { Follow } from "@fedify/fedify";

import { createCtx, mocks } from "./federation.helpers";

import type { Undo } from "@fedify/fedify";

const { handleUndo } = await import("../federation/handleUndo");

describe("handleUndo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes a follow relationship idempotently on Undo(Follow)", async () => {
    const undo = {
      actorId: new URL("https://remote.test/users/bob"),
      getObject: vi.fn(
        async () =>
          new Follow({
            actor: new URL("https://remote.test/users/bob"),
            object: new URL("https://example.com/users/alice"),
          }),
      ),
    };
    mocks.prisma.actor.findFirst
      .mockResolvedValueOnce({ id: "local-actor" })
      .mockResolvedValueOnce({ id: "remote-actor" });

    await handleUndo(createCtx(), undo as Pick<Undo, "actorId" | "getObject"> as Undo);

    expect(mocks.prisma.follows.deleteMany).toHaveBeenCalledWith({
      where: { followingId: "local-actor", followerId: "remote-actor" },
    });
  });
});
