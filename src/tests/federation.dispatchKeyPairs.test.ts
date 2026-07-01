import { createCtx, mocks } from "./federation.helpers";

const { dispatchKeyPairs } = await import("../federation/dispatchKeyPairs");

describe("dispatchKeyPairs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates missing key pairs with upsert", async () => {
    mocks.prisma.actor.findFirst.mockResolvedValueOnce({ id: "actor-1", keys: [] });
    mocks.prisma.keys.upsert.mockImplementation(async ({ create }) => ({
      privateKey: create.privateKey,
      publicKey: create.publicKey,
    }));

    const pairs = await dispatchKeyPairs(createCtx(), "alice");

    expect(pairs).toHaveLength(2);
    expect(mocks.prisma.keys.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.keys.upsert.mock.calls[0][0]).toMatchObject({
      where: { actorId_type: { actorId: "actor-1", type: "RSASSA-PKCS1-v1_5" } },
      update: {},
    });
  });
});
