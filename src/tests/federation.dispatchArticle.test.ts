import { createCtx, mocks } from "./federation.helpers";

const { dispatchArticle } = await import("../federation/dispatchArticle");

describe("dispatchArticle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes UUID slugs to comments", async () => {
    mocks.prisma.comment.findFirst.mockResolvedValueOnce(null);

    await dispatchArticle(createCtx(), { slug: "11111111-1111-4111-8111-111111111111" });

    expect(mocks.prisma.comment.findFirst).toHaveBeenCalled();
    expect(mocks.prisma.posts.findFirst).not.toHaveBeenCalled();
  });
});
