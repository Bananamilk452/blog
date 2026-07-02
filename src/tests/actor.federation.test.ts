import { Person } from "@fedify/vocab";

const mocks = vi.hoisted(() => ({
  ctx: {
    getActor: vi.fn(),
    sendActivity: vi.fn(),
  },
  prisma: {
    $transaction: vi.fn(),
    mainActor: { findFirst: vi.fn() },
    actor: { update: vi.fn() },
    image: { create: vi.fn() },
  },
}));

export {};

vi.mock("~/federation", () => ({
  federation: {
    createContext: vi.fn(() => mocks.ctx),
  },
}));

vi.mock("../lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../lib/models/s3", () => ({ uploadFile: vi.fn() }));

const actorModel = await import("../lib/models/actor");

describe("actor model federation publishing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
  });

  it("uses username, not handle, when federating actor profile updates", async () => {
    const actor = new Person({
      id: new URL("https://example.com/users/alice"),
      inbox: new URL("https://example.com/users/alice/inbox"),
    });
    mocks.prisma.mainActor.findFirst.mockResolvedValueOnce({
      actor: {
        id: "actor-1",
        username: "alice",
        handle: "@alice@example.com",
        avatarId: null,
        bannerId: null,
      },
    });
    mocks.prisma.actor.update.mockResolvedValueOnce({
      id: "actor-1",
      username: "alice",
      handle: "@alice@example.com",
    });
    mocks.ctx.getActor.mockResolvedValueOnce(actor);

    await actorModel.updateMainActor({ name: "Alice", summary: "hello" });

    expect(mocks.ctx.getActor).toHaveBeenCalledWith("alice");
    expect(mocks.ctx.sendActivity).toHaveBeenCalledWith(
      { identifier: "alice" },
      "followers",
      expect.anything(),
    );
  });
});
