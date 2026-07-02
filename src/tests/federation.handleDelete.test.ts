import { createCtx, mocks } from "./federation.helpers";

import type { Delete } from "@fedify/vocab";

const { handleDelete } = await import("../federation/handleDelete");

describe("handleDelete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes only comments owned by the Delete actor", async () => {
    mocks.prisma.comment.findFirst.mockResolvedValueOnce({
      id: "comment-1",
      actor: { uri: "https://remote.test/users/bob" },
    });

    await handleDelete(createCtx(), {
      objectId: new URL("https://remote.test/notes/1"),
      actorId: new URL("https://remote.test/users/bob"),
    } as Pick<Delete, "objectId" | "actorId"> as Delete);

    expect(mocks.prisma.comment.delete).toHaveBeenCalledWith({ where: { id: "comment-1" } });
  });

  it("ignores unauthorized Delete activities", async () => {
    mocks.prisma.comment.findFirst.mockResolvedValueOnce({
      id: "comment-1",
      actor: { uri: "https://remote.test/users/bob" },
    });

    await handleDelete(createCtx(), {
      objectId: new URL("https://remote.test/notes/1"),
      actorId: new URL("https://evil.test/users/mallory"),
    } as Pick<Delete, "objectId" | "actorId"> as Delete);

    expect(mocks.prisma.comment.delete).not.toHaveBeenCalled();
  });

  it("ignores Delete activities without an object id", async () => {
    await handleDelete(createCtx(), {} as Pick<Delete, "objectId"> as Delete);

    expect(mocks.prisma.comment.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.comment.delete).not.toHaveBeenCalled();
  });

  it("ignores Delete activities for unknown comments", async () => {
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);

    await handleDelete(createCtx(), {
      objectId: new URL("https://remote.test/notes/missing"),
    } as Pick<Delete, "objectId"> as Delete);

    expect(mocks.prisma.comment.delete).not.toHaveBeenCalled();
  });
});
