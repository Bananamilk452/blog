import { Note, PUBLIC_COLLECTION } from "@fedify/vocab";

import { createCtx, mocks } from "./federation.helpers";

const [{ dispatchOutbox }, { countOutboxItems }] = await Promise.all([
  import("../federation/dispatchOutbox"),
  import("../federation/countOutboxItems"),
]);

describe("dispatchOutbox", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dispatches published posts as outbox Create activities", async () => {
    const note = new Note({
      id: new URL("https://example.com/post/hello"),
      attribution: new URL("https://example.com/users/alice"),
      tos: [PUBLIC_COLLECTION],
      ccs: [new URL("https://example.com/users/alice/followers")],
    });
    const ctx = createCtx(note);
    mocks.prisma.posts.findMany.mockResolvedValueOnce([{ slug: "hello" }]);

    const result = await dispatchOutbox(ctx, "alice");

    expect(mocks.prisma.posts.findMany).toHaveBeenCalledWith({
      where: {
        state: "published",
        slug: { not: null },
        actor: { username: "alice", userId: { not: null } },
      },
      orderBy: { publishedAt: "desc" },
      select: { slug: true },
    });
    expect(ctx.getObject).toHaveBeenCalledWith(Note, { slug: "hello" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.objectId?.href).toBe("https://example.com/post/hello");
  });

  it("counts published outbox items", async () => {
    mocks.prisma.posts.count.mockResolvedValueOnce(2);

    await expect(countOutboxItems(createCtx(), "alice")).resolves.toBe(2);
    expect(mocks.prisma.posts.count).toHaveBeenCalledWith({
      where: {
        state: "published",
        slug: { not: null },
        actor: { username: "alice", userId: { not: null } },
      },
    });
  });
});
