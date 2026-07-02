import { Follow } from "@fedify/vocab";

import { createCtx, createRemoteActor, mocks } from "./federation.helpers";

const { handleFollow } = await import("../federation/handleFollow");

describe("handleFollow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a valid Follow and stores the relationship", async () => {
    const ctx = createCtx();
    const follower = createRemoteActor();
    const follow = new Follow({
      id: new URL("https://remote.test/activities/follow-1"),
      actor: follower.id,
      object: new URL("https://example.com/users/alice"),
    });
    vi.spyOn(follow, "getActor").mockResolvedValue(follower);
    mocks.prisma.actor.findFirst.mockResolvedValueOnce({ id: "local-actor" });
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor" });

    await handleFollow(ctx, follow);

    expect(mocks.prisma.follows.create).toHaveBeenCalledWith({
      data: { followingId: "local-actor", followerId: "remote-actor" },
    });
    expect(ctx.sendActivity).toHaveBeenCalledTimes(1);
    expect(ctx.sendActivity.mock.calls[0][0]).toEqual({ identifier: "alice" });
  });

  it("accepts duplicate Follow activities without creating another relationship", async () => {
    const ctx = createCtx();
    const follower = createRemoteActor();
    const follow = new Follow({
      actor: follower.id,
      object: new URL("https://example.com/users/alice"),
    });
    vi.spyOn(follow, "getActor").mockResolvedValue(follower);
    mocks.prisma.actor.findFirst.mockResolvedValueOnce({ id: "local-actor" });
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor" });
    mocks.prisma.follows.create.mockRejectedValueOnce({ code: "P2002" });

    await handleFollow(ctx, follow);

    expect(ctx.sendActivity).toHaveBeenCalledTimes(1);
  });

  it("throws when Follow persistence fails for a non-unique error", async () => {
    const ctx = createCtx();
    const follower = createRemoteActor();
    const follow = new Follow({
      actor: follower.id,
      object: new URL("https://example.com/users/alice"),
    });
    vi.spyOn(follow, "getActor").mockResolvedValue(follower);
    mocks.prisma.actor.findFirst.mockResolvedValueOnce({ id: "local-actor" });
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor" });
    mocks.prisma.follows.create.mockRejectedValueOnce(new Error("db down"));

    await expect(handleFollow(ctx, follow)).rejects.toThrow("db down");

    expect(ctx.sendActivity).not.toHaveBeenCalled();
  });
});
