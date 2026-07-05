import { Document, Note, PUBLIC_COLLECTION } from "@fedify/vocab";

import { createCtx, createRemoteActor, mocks } from "./federation.helpers";

import type { NoteAttachments } from "./federation.helpers";
import type { Create } from "@fedify/vocab";

const { handleCreate } = await import("../federation/handleCreate");

describe("handleCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.mainActor.findFirst.mockResolvedValue({
      actor: { uri: "https://example.com/users/alice", username: "alice" },
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
      })() as NoteAttachments,
    );
    mocks.prisma.posts.findFirst.mockResolvedValueOnce({ id: "post-1" });
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor", username: "bob", name: null });
    mocks.getTagFromNote.mockReturnValueOnce([
      { type: "Mention", href: "https://example.com/users/alice", name: "@alice@example.com" },
    ]);

    await handleCreate(createCtx(), {
      id: new URL("https://remote.test/activities/create-1"),
      actorId: author.id,
      getObject: vi.fn(async () => note),
    } as Pick<Create, "id" | "actorId" | "getObject"> as Create);

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
    expect(mocks.sendPushNotificationToAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ title: "새 댓글", tag: "activitypub-comment" }),
    );
  });

  it("creates a local reply using the parent comment post", async () => {
    const author = createRemoteActor();
    const replyTarget = new Note({ id: new URL("https://remote.test/notes/parent") });
    const note = new Note({
      id: new URL("https://remote.test/notes/reply"),
      content: "<p>Reply</p>",
    });
    vi.spyOn(note, "getAttribution").mockResolvedValue(author);
    vi.spyOn(note, "getReplyTarget").mockResolvedValue(replyTarget);
    vi.spyOn(note, "getAttachments").mockReturnValue((async function* () {})() as NoteAttachments);
    mocks.prisma.posts.findFirst.mockResolvedValueOnce(null);
    mocks.prisma.comment.findFirst.mockResolvedValueOnce({ id: "parent-1", postId: "post-1" });
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor", username: "bob", name: null });
    mocks.getTagFromNote.mockReturnValueOnce([]);

    await handleCreate(createCtx(), {
      actorId: author.id,
      getObject: vi.fn(async () => note),
    } as Pick<Create, "actorId" | "getObject"> as Create);

    expect(mocks.prisma.comment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        uri: "https://remote.test/notes/reply",
        postId: "post-1",
        parentId: "parent-1",
      }),
    });
    expect(mocks.sendPushNotificationToAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ title: "새 댓글", tag: "activitypub-comment" }),
    );
  });

  it("ignores duplicate Create(Note) activities", async () => {
    const author = createRemoteActor();
    const replyTarget = new Note({ id: new URL("https://example.com/post/hello") });
    const note = new Note({ id: new URL("https://remote.test/notes/1") });
    vi.spyOn(note, "getAttribution").mockResolvedValue(author);
    vi.spyOn(note, "getReplyTarget").mockResolvedValue(replyTarget);
    vi.spyOn(note, "getAttachments").mockReturnValue((async function* () {})() as NoteAttachments);
    mocks.prisma.posts.findFirst.mockResolvedValueOnce({ id: "post-1" });
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor", username: "bob", name: null });
    mocks.prisma.comment.create.mockRejectedValueOnce({ code: "P2002" });

    await expect(
      handleCreate(createCtx(), {
        actorId: author.id,
        getObject: vi.fn(async () => note),
      } as Pick<Create, "actorId" | "getObject"> as Create),
    ).resolves.toBe("ignored");
    expect(mocks.sendPushNotificationToAdmins).not.toHaveBeenCalled();
  });

  it("stores a direct message from a remote Create(Note) without a local reply target", async () => {
    const author = createRemoteActor();
    const note = new Note({
      id: new URL("https://remote.test/notes/direct-1"),
      content: "<p>Secret hello</p>",
      tos: [new URL("https://example.com/users/alice")],
      url: new URL("https://remote.test/@bob/direct-1"),
    });
    vi.spyOn(note, "getAttribution").mockResolvedValue(author);
    vi.spyOn(note, "getReplyTarget").mockResolvedValue(null);
    vi.spyOn(note, "getAttachments").mockReturnValue(
      (async function* () {
        yield new Document({
          url: new URL("https://remote.test/direct-image.png"),
          mediaType: "image/png",
        });
      })() as NoteAttachments,
    );
    mocks.upsertActor.mockResolvedValueOnce({ id: "remote-actor", username: "bob", name: null });
    mocks.getTagFromNote.mockReturnValueOnce([]);

    await expect(
      handleCreate(createCtx(), {
        actorId: author.id,
        getObject: vi.fn(async () => note),
      } as Pick<Create, "actorId" | "getObject"> as Create),
    ).resolves.toBe("handled");

    expect(mocks.prisma.directMessage.create).toHaveBeenCalledWith({
      data: {
        uri: "https://remote.test/notes/direct-1",
        actorId: "remote-actor",
        content: "<p>Secret hello</p>",
        url: "https://remote.test/@bob/direct-1",
        to: ["https://example.com/users/alice"],
        cc: [],
        mentions: [],
        replyTargetUri: undefined,
        attachment: {
          createMany: {
            data: [
              {
                url: "https://remote.test/direct-image.png",
                mediaType: "image/png",
                sensitive: false,
                name: undefined,
              },
            ],
          },
        },
      },
    });
    expect(mocks.sendPushNotificationToAdmins).not.toHaveBeenCalled();
  });
});
