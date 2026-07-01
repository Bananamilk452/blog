import { createCtx, mocks } from "./federation.helpers";

const [{ dispatchFollowers }, { countFollowers }] = await Promise.all([
  import("../federation/dispatchFollowers"),
  import("../federation/countFollowers"),
]);

describe("dispatchFollowers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dispatches followers as ActivityPub recipients", async () => {
    mocks.prisma.follows.findMany.mockResolvedValueOnce([
      {
        follower: {
          uri: "https://remote.test/users/bob",
          inboxUrl: "https://remote.test/users/bob/inbox",
          sharedInboxUrl: "https://remote.test/inbox",
        },
      },
    ]);

    const result = await dispatchFollowers(createCtx(), "alice");

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id!.href).toBe("https://remote.test/users/bob");
    expect(result.items[0]!.endpoints!.sharedInbox!.href).toBe("https://remote.test/inbox");
  });

  it("dispatches followers without shared inbox endpoints", async () => {
    mocks.prisma.follows.findMany.mockResolvedValueOnce([
      {
        follower: {
          uri: "https://remote.test/users/bob",
          inboxUrl: "https://remote.test/users/bob/inbox",
          sharedInboxUrl: null,
        },
      },
    ]);

    const result = await dispatchFollowers(createCtx(), "alice");

    expect(result.items[0]!.endpoints).toBeNull();
  });

  it("counts followers for a local actor", async () => {
    mocks.prisma.follows.count.mockResolvedValueOnce(3);

    await expect(countFollowers(createCtx(), "alice")).resolves.toBe(3);
  });
});
