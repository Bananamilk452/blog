import { Note, PUBLIC_COLLECTION } from "@fedify/vocab";

import { createCtx, createRemoteActor, mocks } from "./federation.helpers";

import type { NoteAttachments } from "./federation.helpers";
import type { Update } from "@fedify/vocab";

const { handleUpdate } = await import("../federation/handleUpdate");

describe("handleUpdate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates comment content, addressing, mentions, and attachments", async () => {
    const note = new Note({
      id: new URL("https://remote.test/notes/1"),
      content: "<p>Edited</p>",
      tos: [PUBLIC_COLLECTION],
      ccs: [new URL("https://remote.test/users/bob/followers")],
      url: new URL("https://remote.test/@bob/1"),
    });
    vi.spyOn(note, "getAttachments").mockReturnValue((async function* () {})() as NoteAttachments);
    mocks.prisma.comment.findFirst.mockResolvedValueOnce({
      id: "comment-1",
      actor: { uri: "https://remote.test/users/bob" },
    });
    mocks.getTagFromNote.mockReturnValueOnce([]);

    await handleUpdate(createCtx(), {
      actorId: new URL("https://remote.test/users/bob"),
      getObject: vi.fn(async () => note),
    } as Pick<Update, "actorId" | "getObject"> as Update);

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

  it("updates actor profiles only when the actor updates themselves", async () => {
    const actor = createRemoteActor();

    await handleUpdate(createCtx(), {
      actorId: actor.id,
      getObject: vi.fn(async () => actor),
    } as Pick<Update, "actorId" | "getObject"> as Update);

    expect(mocks.upsertActor).toHaveBeenCalledWith(actor);
  });

  it("ignores actor profile updates from a different actor", async () => {
    const actor = createRemoteActor();

    await handleUpdate(createCtx(), {
      actorId: new URL("https://evil.test/users/mallory"),
      getObject: vi.fn(async () => actor),
    } as Pick<Update, "actorId" | "getObject"> as Update);

    expect(mocks.upsertActor).not.toHaveBeenCalled();
  });
});
