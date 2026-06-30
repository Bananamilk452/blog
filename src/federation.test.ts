import { Document, Follow, Note, Person, PUBLIC_COLLECTION } from "@fedify/fedify";

const mocks = vi.hoisted(() => ({
  prisma: {
    actor: { findFirst: vi.fn() },
    keys: { upsert: vi.fn() },
    follows: { create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    posts: { findFirst: vi.fn() },
    comment: { create: vi.fn(), delete: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
  upsertActor: vi.fn(),
  getTagFromNote: vi.fn(),
}));

vi.mock("@fedify/redis", () => ({
  RedisKvStore: vi.fn(function RedisKvStore() {}),
  RedisMessageQueue: vi.fn(function RedisMessageQueue() {}),
}));

vi.mock("ioredis", () => ({ Redis: vi.fn(function Redis() {}) }));

vi.mock("./lib/prisma", () => ({ prisma: mocks.prisma }));

vi.mock("./lib/utils-federation", () => ({
  getTagFromNote: mocks.getTagFromNote,
  isUniqueConstraintError: (error: unknown) =>
    typeof error === "object" && error != null && "code" in error && error.code === "P2002",
  upsertActor: mocks.upsertActor,
}));

const federationModule = await import("./federation");

function createCtx() {
  return {
    getActorKeyPairs: vi.fn(async () => []),
    getActorUri: vi.fn(
      (identifier: string) => new URL(`/users/${identifier}`, "https://example.com"),
    ),
    getFollowersUri: vi.fn(
      (identifier: string) => new URL(`/users/${identifier}/followers`, "https://example.com"),
    ),
    getObjectUri: vi.fn(
      (_type: unknown, values: { slug: string }) =>
        new URL(`/post/${values.slug}`, "https://example.com"),
    ),
    getOutboxUri: vi.fn(
      (identifier: string) => new URL(`/users/${identifier}/outbox`, "https://example.com"),
    ),
    parseUri: vi.fn((url: URL) => ({ type: "actor", identifier: url.pathname.split("/").at(-1) })),
    sendActivity: vi.fn(),
  };
}

function createRemoteActor(uri = "https://remote.test/users/bob") {
  return new Person({
    id: new URL(uri),
    preferredUsername: "bob",
    inbox: new URL("https://remote.test/users/bob/inbox"),
  });
}

describe("federation dispatchers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    const actor = await federationModule.dispatchActor(ctx, "alice");

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

    await expect(federationModule.dispatchActor(createCtx(), "missing")).resolves.toBeNull();
  });

  it("creates missing key pairs with upsert", async () => {
    mocks.prisma.actor.findFirst.mockResolvedValueOnce({ id: "actor-1", keys: [] });
    mocks.prisma.keys.upsert.mockImplementation(async ({ create }) => ({
      privateKey: create.privateKey,
      publicKey: create.publicKey,
    }));

    const pairs = await federationModule.dispatchKeyPairs(createCtx(), "alice");

    expect(pairs).toHaveLength(2);
    expect(mocks.prisma.keys.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.keys.upsert.mock.calls[0][0]).toMatchObject({
      where: { actorId_type: { actorId: "actor-1", type: "RSASSA-PKCS1-v1_5" } },
      update: {},
    });
  });
});

describe("federation inbox handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    await federationModule.handleFollow(ctx, follow);

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

    await federationModule.handleFollow(ctx, follow);

    expect(ctx.sendActivity).toHaveBeenCalledTimes(1);
  });

  it("does not accept Follow activities when persistence fails for a non-unique error", async () => {
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

    await federationModule.handleFollow(ctx, follow);

    expect(ctx.sendActivity).not.toHaveBeenCalled();
  });

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

    await federationModule.handleUndo(createCtx(), undo as any);

    expect(mocks.prisma.follows.deleteMany).toHaveBeenCalledWith({
      where: { followingId: "local-actor", followerId: "remote-actor" },
    });
  });

  it("creates a local comment from a remote Create(Note) reply", async () => {
    const author = createRemoteActor();
    const replyTarget = new Note({ id: new URL("https://example.com/post/hello") });
    const note = new Note({
      id: new URL("https://remote.test/notes/1"),
      content: "<p>Hello</p>",
      tos: [PUBLIC_COLLECTION],
      ccs: [new URL("https://remote.test/users/bob/followers")],
      url: new URL("https://remote.test/@bob/1"),
    });
    vi.spyOn(note, "getAttribution").mockResolvedValue(author);
    vi.spyOn(note, "getReplyTarget").mockResolvedValue(replyTarget);
    vi.spyOn(note, "getAttachments").mockReturnValue(
      (async function* () {
        yield new Document({
          url: new URL("https://remote.test/image.png"),
          mediaType: "image/png",
        });
      })() as any,
    );
    mocks.prisma.posts.findFirst.mockResolvedValueOnce({ id: "post-1" });
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor" });
    mocks.getTagFromNote.mockReturnValueOnce([
      { type: "Mention", href: "https://example.com/users/alice", name: "@alice@example.com" },
    ]);

    await federationModule.handleCreate(createCtx(), {
      id: new URL("https://remote.test/activities/create-1"),
      actorId: author.id,
      getObject: vi.fn(async () => note),
    } as any);

    expect(mocks.prisma.comment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        uri: "https://remote.test/notes/1",
        actorId: "remote-actor",
        postId: "post-1",
        parentId: null,
        content: "<p>Hello</p>",
        attachment: {
          createMany: {
            data: [
              {
                url: "https://remote.test/image.png",
                mediaType: "image/png",
                sensitive: false,
                name: undefined,
              },
            ],
          },
        },
      }),
    });
  });

  it("deletes only comments owned by the Delete actor", async () => {
    mocks.prisma.comment.findFirst.mockResolvedValueOnce({
      id: "comment-1",
      actor: { uri: "https://remote.test/users/bob" },
    });

    await federationModule.handleDelete(createCtx(), {
      objectId: new URL("https://remote.test/notes/1"),
      actorId: new URL("https://remote.test/users/bob"),
    } as any);

    expect(mocks.prisma.comment.delete).toHaveBeenCalledWith({ where: { id: "comment-1" } });
  });

  it("ignores unauthorized Delete activities", async () => {
    mocks.prisma.comment.findFirst.mockResolvedValueOnce({
      id: "comment-1",
      actor: { uri: "https://remote.test/users/bob" },
    });

    await federationModule.handleDelete(createCtx(), {
      objectId: new URL("https://remote.test/notes/1"),
      actorId: new URL("https://evil.test/users/mallory"),
    } as any);

    expect(mocks.prisma.comment.delete).not.toHaveBeenCalled();
  });

  it("updates comment content, addressing, mentions, and attachments", async () => {
    const note = new Note({
      id: new URL("https://remote.test/notes/1"),
      content: "<p>Edited</p>",
      tos: [PUBLIC_COLLECTION],
      ccs: [new URL("https://remote.test/users/bob/followers")],
      url: new URL("https://remote.test/@bob/1"),
    });
    vi.spyOn(note, "getAttachments").mockReturnValue((async function* () {})() as any);
    mocks.prisma.comment.findFirst.mockResolvedValueOnce({
      id: "comment-1",
      actor: { uri: "https://remote.test/users/bob" },
    });
    mocks.getTagFromNote.mockReturnValueOnce([]);

    await federationModule.handleUpdate(createCtx(), {
      actorId: new URL("https://remote.test/users/bob"),
      getObject: vi.fn(async () => note),
    } as any);

    expect(mocks.prisma.comment.update).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: expect.objectContaining({
        content: "<p>Edited</p>",
        to: [PUBLIC_COLLECTION.href],
        cc: ["https://remote.test/users/bob/followers"],
        mentions: [],
        attachment: { deleteMany: {}, createMany: { data: [] } },
      }),
    });
  });
});

describe("followers and object dispatchers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    const result = await federationModule.dispatchFollowers(createCtx(), "alice");

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id!.href).toBe("https://remote.test/users/bob");
    expect(result.items[0]!.endpoints!.sharedInbox!.href).toBe("https://remote.test/inbox");
  });

  it("counts followers for a local actor", async () => {
    mocks.prisma.follows.count.mockResolvedValueOnce(3);

    await expect(federationModule.countFollowers(createCtx(), "alice")).resolves.toBe(3);
  });

  it("dispatches a public blog post Note", async () => {
    const date = new Date("2026-01-02T00:00:00.000Z");
    mocks.prisma.posts.findFirst.mockResolvedValueOnce({
      uri: "https://example.com/post/hello",
      title: "Hello",
      content: "<p>Body</p>",
      updatedAt: date,
      createdAt: date,
      publishedAt: date,
      user: { name: "Alice" },
      actor: { username: "alice" },
      banner: { url: "https://example.com/banner.png" },
    });

    const note = await federationModule.dispatchNote(createCtx(), { slug: "hello" });

    expect(note?.id?.href).toBe("https://example.com/post/hello");
    expect(note?.toIds.map((url) => url.href)).toContain(PUBLIC_COLLECTION.href);
    expect(note?.ccIds.map((url) => url.href)).toContain(
      "https://example.com/users/alice/followers",
    );
  });
});
