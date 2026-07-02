import { Document, Note, PUBLIC_COLLECTION } from "@fedify/vocab";

vi.mock("../lib/models/s3", () => ({ uploadFile: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: {} }));
vi.mock("../lib/utils-server", () => ({ downloadFile: vi.fn() }));

import {
  getTagFromNote,
  isFollowersOnly,
  isNonList,
  isPublic,
  isUniqueConstraintError,
  formatNoteAttachments,
} from "../lib/utils-federation";

describe("utils-federation", () => {
  describe("visibility helpers", () => {
    it("detects public addressing", () => {
      expect(isPublic([PUBLIC_COLLECTION.href])).toBe(true);
      expect(isPublic(["https://example.com/users/alice/followers"])).toBeUndefined();
    });

    it("detects unlisted addressing", () => {
      expect(
        isNonList(["https://example.com/users/alice/followers"], [PUBLIC_COLLECTION.href]),
      ).toBe(true);
      expect(isNonList([PUBLIC_COLLECTION.href], [])).toBe(false);
    });

    it("detects followers-only addressing", () => {
      expect(isFollowersOnly(["https://example.com/users/alice/followers"], [])).toBe(true);
      expect(isFollowersOnly([], [PUBLIC_COLLECTION.href])).toBe(false);
    });
  });

  describe("getTagFromNote", () => {
    it("returns only complete Mention tags", () => {
      const note = {
        toJsonLd: () => ({
          tag: [
            { type: "Mention", href: "https://remote.test/users/bob", name: "@bob@remote.test" },
            { type: "Hashtag", href: "https://remote.test/tags/test", name: "#test" },
            { type: "Mention", name: "@missingHref@remote.test" },
          ],
        }),
      };

      expect(getTagFromNote(note as unknown as Note)).toEqual([
        { type: "Mention", href: "https://remote.test/users/bob", name: "@bob@remote.test" },
      ]);
    });

    it("supports a single tag object", () => {
      const note = {
        toJsonLd: () => ({
          tag: { type: "Mention", href: "https://remote.test/users/bob", name: "@bob@remote.test" },
        }),
      };

      expect(getTagFromNote(note as unknown as Note)).toEqual([
        { type: "Mention", href: "https://remote.test/users/bob", name: "@bob@remote.test" },
      ]);
    });

    it("returns an empty array when tag is absent", () => {
      const note = { toJsonLd: () => ({ type: "Note" }) };

      expect(getTagFromNote(note as unknown as Note)).toEqual([]);
    });
  });

  it("detects Prisma unique constraint errors", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true);
    expect(isUniqueConstraintError({ code: "P2025" })).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
  });

  it("formats Document note attachments", async () => {
    const note = new Note({});
    vi.spyOn(note, "getAttachments").mockReturnValue(
      (async function* () {
        yield new Document({
          url: new URL("https://remote.test/image.png"),
          mediaType: "image/png",
          sensitive: true,
          name: "image",
        });
      })() as ReturnType<Note["getAttachments"]>,
    );

    await expect(formatNoteAttachments(note)).resolves.toEqual([
      {
        url: "https://remote.test/image.png",
        mediaType: "image/png",
        sensitive: true,
        name: "image",
      },
    ]);
  });
});
