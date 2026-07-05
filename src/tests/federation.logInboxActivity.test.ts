import { Follow } from "@fedify/vocab";

import { createCtx, mocks } from "./federation.helpers";

const logMocks = vi.hoisted(() => ({
  federationInboxLog: vi.fn(),
}));

vi.mock("~/lib/server-log", () => ({
  federationInboxLog: logMocks.federationInboxLog,
}));

const { logInboxActivity } = await import("../federation/logInboxActivity");

describe("logInboxActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.inboxActivityLog.create.mockResolvedValue({ id: "log-1" });
  });

  it("records incoming activity metadata and handled status", async () => {
    const follow = new Follow({
      id: new URL("https://remote.test/activities/follow-1"),
      actor: new URL("https://remote.test/users/bob"),
      object: new URL("https://example.com/users/alice"),
    });
    const handler = vi.fn(async () => "handled" as const);

    await logInboxActivity(handler)(createCtx(), follow);

    expect(mocks.prisma.inboxActivityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        activityId: "https://remote.test/activities/follow-1",
        activityType: "Follow",
        actorUri: "https://remote.test/users/bob",
        objectId: "https://example.com/users/alice",
        status: "received",
      }),
    });
    expect(mocks.prisma.inboxActivityLog.update).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: { status: "handled", handledAt: expect.any(Date) },
    });
  });

  it("records failed status and rethrows handler errors", async () => {
    const follow = new Follow({
      actor: new URL("https://remote.test/users/bob"),
      object: new URL("https://example.com/users/alice"),
    });
    const handler = vi.fn(async () => {
      throw new Error("boom");
    });

    await expect(logInboxActivity(handler)(createCtx(), follow)).rejects.toThrow("boom");

    expect(mocks.prisma.inboxActivityLog.update).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: { status: "failed", errorMessage: "boom", handledAt: expect.any(Date) },
    });
    expect(logMocks.federationInboxLog).toHaveBeenCalledWith(
      "Failed to handle inbox activity: type=%s activityId=%s actor=%s object=%s error=%s",
      "Follow",
      undefined,
      "https://remote.test/users/bob",
      "https://example.com/users/alice",
      "boom",
    );
  });
});
