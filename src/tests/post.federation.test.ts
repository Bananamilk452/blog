import { Note } from "@fedify/fedify";

const mocks = vi.hoisted(() => ({
  ctx: {
    getFollowersUri: vi.fn(
      (identifier: string) => new URL(`/users/${identifier}/followers`, "https://example.com"),
    ),
    getObject: vi.fn(),
    lookupObject: vi.fn(),
    sendActivity: vi.fn(),
  },
  prisma: {
    $transaction: vi.fn(),
    mainActor: { findFirst: vi.fn() },
    posts: {
      delete: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    comment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("~/federation", () => ({
  federation: {
    createContext: vi.fn(() => mocks.ctx),
  },
}));

vi.mock("~/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../lib/models/s3", () => ({ uploadFile: vi.fn() }));
vi.mock("../lib/utils-federation", () => ({
  isPublic: (toIds: string[]) => toIds.includes("https://www.w3.org/ns/activitystreams#Public"),
  isNonList: () => false,
  isFollowersOnly: () => false,
}));
vi.mock("marked", () => ({ marked: vi.fn(async (content: string) => `<p>${content}</p>`) }));
vi.mock("isomorphic-dompurify", () => ({
  default: { sanitize: vi.fn((content: string) => content) },
}));

const postModel = await import("../lib/models/post");

function localMainActor() {
  return {
    actor: {
      id: "local-actor-id",
      username: "alice",
      uri: "https://example.com/users/alice",
    },
  };
}

describe("post model federation publishing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
  });

  it("loads a Note before deleting a published post and then sends Delete to followers", async () => {
    const note = new Note({
      id: new URL("https://example.com/post/hello"),
      attribution: new URL("https://example.com/users/alice"),
    });
    const post = {
      id: "post-1",
      slug: "hello",
      state: "published",
    };
    const calls: string[] = [];
    mocks.prisma.mainActor.findFirst.mockResolvedValueOnce(localMainActor());
    mocks.prisma.posts.findUniqueOrThrow.mockImplementationOnce(async () => {
      calls.push("findUniqueOrThrow");
      return post;
    });
    mocks.ctx.getObject.mockImplementationOnce(async () => {
      calls.push("getObject");
      return note;
    });
    mocks.prisma.posts.delete.mockImplementationOnce(async () => {
      calls.push("delete");
      return post;
    });

    await postModel.deletePost("post-1");

    expect(calls).toEqual(["findUniqueOrThrow", "getObject", "delete"]);
    expect(mocks.ctx.sendActivity).toHaveBeenCalledTimes(1);
    expect(mocks.ctx.sendActivity.mock.calls[0][0]).toEqual({ identifier: "alice" });
    expect(mocks.ctx.sendActivity.mock.calls[0][1]).toBe("followers");
  });

  it("does not federate Delete for draft posts", async () => {
    mocks.prisma.mainActor.findFirst.mockResolvedValueOnce(localMainActor());
    mocks.prisma.posts.findUniqueOrThrow.mockResolvedValueOnce({
      id: "post-1",
      slug: "hello",
      state: "draft",
    });
    mocks.prisma.posts.delete.mockResolvedValueOnce({ id: "post-1", state: "draft" });

    await postModel.deletePost("post-1");

    expect(mocks.ctx.getObject).not.toHaveBeenCalled();
    expect(mocks.ctx.sendActivity).not.toHaveBeenCalled();
  });

  it("sends local comment Create to followers even without mentions", async () => {
    const note = new Note({
      id: new URL("https://example.com/post/hello-comment"),
      attribution: new URL("https://example.com/users/alice"),
      tos: [new URL("https://example.com/users/alice")],
      ccs: [new URL("https://www.w3.org/ns/activitystreams#Public")],
    });
    mocks.prisma.posts.findUniqueOrThrow.mockResolvedValueOnce({ id: "post-1", slug: "hello" });
    mocks.prisma.mainActor.findFirst.mockResolvedValueOnce(localMainActor());
    mocks.prisma.posts.findUnique.mockResolvedValueOnce({
      actor: { uri: "https://example.com/users/alice", username: "alice" },
    });
    mocks.prisma.comment.create.mockResolvedValueOnce({ id: "comment-1" });
    mocks.prisma.comment.update.mockResolvedValueOnce({
      id: "comment-1",
      uri: "https://example.com/post/hello-comment",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    mocks.ctx.getObject.mockResolvedValueOnce(note);

    await postModel.createComment("local-actor-id", {
      postId: "post-1",
      content: "hello",
    });

    expect(mocks.ctx.sendActivity).toHaveBeenCalledWith(
      { identifier: "alice" },
      "followers",
      expect.anything(),
    );
  });

  it("returns only top-level comments with deeply nested replies", async () => {
    const topLevel = comment({ id: "comment-1", parentId: null });
    const reply = comment({ id: "comment-2", parentId: "comment-1" });
    const nestedReply = comment({ id: "comment-3", parentId: "comment-2" });
    const deeplyNestedReply = comment({ id: "comment-4", parentId: "comment-3" });

    mocks.prisma.posts.findUniqueOrThrow.mockResolvedValueOnce({ id: "post-1" });
    mocks.prisma.comment.findMany.mockResolvedValueOnce([
      topLevel,
      reply,
      nestedReply,
      deeplyNestedReply,
    ]);

    const comments = await postModel.getCommentsBySlug("hello");

    expect(mocks.prisma.comment.findMany).toHaveBeenCalledWith({
      where: { postId: "post-1" },
      include: {
        attachment: true,
        actor: {
          include: {
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe("comment-1");
    expect(comments[0].replies[0].id).toBe("comment-2");
    expect(comments[0].replies[0].replies[0].id).toBe("comment-3");
    expect(comments[0].replies[0].replies[0].replies[0].id).toBe("comment-4");
  });

  it("returns orphan replies as top-level comments", async () => {
    const topLevel = comment({ id: "comment-1", parentId: null });
    const orphan = comment({ id: "comment-2", parentId: "missing-comment" });

    mocks.prisma.posts.findUniqueOrThrow.mockResolvedValueOnce({ id: "post-1" });
    mocks.prisma.comment.findMany.mockResolvedValueOnce([topLevel, orphan]);

    const comments = await postModel.getCommentsBySlug("hello");

    expect(comments.map((comment) => comment.id)).toEqual(["comment-1", "comment-2"]);
    expect(comments[1].parentId).toBe("missing-comment");
    expect(comments[1].replies).toEqual([]);
  });
});

function comment({ id, parentId }: { id: string; parentId: string | null }) {
  return {
    id,
    uri: `https://example.com/post/${id}`,
    actorId: "actor-1",
    actor: {
      id: "actor-1",
      uri: "https://example.com/users/alice",
      username: "alice",
      handle: "@alice@example.com",
      name: "Alice",
      inboxUrl: "https://example.com/users/alice/inbox",
      sharedInboxUrl: null,
      url: "https://example.com/users/alice",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      userId: null,
      summary: null,
      avatarId: null,
      bannerId: null,
      avatar: null,
    },
    postId: "post-1",
    parentId,
    content: id,
    url: `https://example.com/post/${id}`,
    to: [],
    cc: [],
    mentions: [],
    attachment: [],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
