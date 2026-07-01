import { createCtx, mocks } from "./federation.helpers";

const { dispatchActor } = await import("../federation/dispatchActor");

describe("dispatchActor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dispatches only local actors and tolerates a missing shared inbox", async () => {
    const ctx = createCtx();
    mocks.prisma.actor.findFirst.mockResolvedValueOnce({
      uri: "https://example.com/users/alice",
      username: "alice",
      name: "Alice",
      summary: "hello",
      inboxUrl: "https://example.com/users/alice/inbox",
      sharedInboxUrl: null,
      avatar: null,
      banner: null,
    });

    const actor = await dispatchActor(ctx, "alice");

    expect(mocks.prisma.actor.findFirst).toHaveBeenCalledWith({
      where: { username: "alice", userId: { not: null } },
      include: { avatar: true, banner: true },
    });
    expect(actor?.id?.href).toBe("https://example.com/users/alice");
    expect(actor?.inboxId?.href).toBe("https://example.com/users/alice/inbox");
    expect(actor?.outboxId?.href).toBe("https://example.com/users/alice/outbox");
  });

  it("returns null when a local actor is not found", async () => {
    mocks.prisma.actor.findFirst.mockResolvedValueOnce(null);

    await expect(dispatchActor(createCtx(), "missing")).resolves.toBeNull();
  });
});
