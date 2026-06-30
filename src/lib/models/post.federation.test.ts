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
vi.mock("./s3", () => ({ uploadFile: vi.fn() }));
vi.mock("../utils-federation", () => ({
  isPublic: (toIds: string[]) => toIds.includes("https://www.w3.org/ns/activitystreams#Public"),
  isNonList: () => false,
  isFollowersOnly: () => false,
}));
vi.mock("marked", () => ({ marked: vi.fn(async (content: string) => `<p>${content}</p>`) }));
vi.mock("isomorphic-dompurify", () => ({
  default: { sanitize: vi.fn((content: string) => content) },
}));

const postModel = await import("./post");

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
});
