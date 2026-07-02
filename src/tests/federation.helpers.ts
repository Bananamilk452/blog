import { Document, Note, Person } from "@fedify/vocab";

import type { Context, InboxContext, RequestContext } from "@fedify/fedify";

vi.hoisted(() => {
  const global = globalThis as typeof globalThis & { __federationTestMocks?: FederationTestMocks };
  global.__federationTestMocks = {
    prisma: {
      actor: { findFirst: vi.fn() },
      keys: { upsert: vi.fn() },
      follows: { create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
      inboxActivityLog: { create: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
      posts: { count: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
      comment: { create: vi.fn(), delete: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
      reaction: { create: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() },
    },
    upsertActor: vi.fn(),
    getTagFromNote: vi.fn(),
  };
});

type FederationTestMocks = {
  prisma: {
    actor: { findFirst: ReturnType<typeof vi.fn> };
    keys: { upsert: ReturnType<typeof vi.fn> };
    follows: {
      create: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    inboxActivityLog: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    posts: {
      count: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    comment: {
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    reaction: {
      create: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  upsertActor: ReturnType<typeof vi.fn>;
  getTagFromNote: ReturnType<typeof vi.fn>;
};

const global = globalThis as typeof globalThis & { __federationTestMocks: FederationTestMocks };

export const mocks = global.__federationTestMocks;

vi.mock("@fedify/redis", () => ({
  RedisKvStore: vi.fn(function RedisKvStore() {}),
  RedisMessageQueue: vi.fn(function RedisMessageQueue() {}),
}));

vi.mock("ioredis", () => ({ Redis: vi.fn(function Redis() {}) }));

vi.mock("../lib/prisma", () => ({ prisma: global.__federationTestMocks.prisma }));

vi.mock("../lib/utils-federation", () => ({
  formatNoteAttachments: async (note: Note) => {
    const formattedAttachments = [];

    for await (const attachment of note.getAttachments()) {
      if (attachment instanceof Document) {
        formattedAttachments.push({
          url: attachment.url?.toString() || "",
          mediaType: attachment.mediaType,
          sensitive: attachment.sensitive || false,
          name: attachment.name?.toString(),
        });
      }
    }

    return formattedAttachments;
  },
  getTagFromNote: global.__federationTestMocks.getTagFromNote,
  isUniqueConstraintError: (error: unknown) =>
    typeof error === "object" && error != null && "code" in error && error.code === "P2002",
  upsertActor: global.__federationTestMocks.upsertActor,
}));

export type NoteAttachments = ReturnType<Note["getAttachments"]>;

export function createCtx(object?: unknown) {
  const ctx = {
    getActorKeyPairs: vi.fn(async () => []),
    getActorUri: vi.fn(
      (identifier: string) => new URL(`/users/${identifier}`, "https://example.com"),
    ),
    getFollowersUri: vi.fn(
      (identifier: string) => new URL(`/users/${identifier}/followers`, "https://example.com"),
    ),
    getObjectUri: vi.fn(
      (_type: unknown, values: { slug?: string; stamp?: string }) =>
        new URL(
          values.stamp ? `/quote-authorizations/${values.stamp}` : `/post/${values.slug}`,
          "https://example.com",
        ),
    ),
    getObject: vi.fn(async () => object),
    getOutboxUri: vi.fn(
      (identifier: string) => new URL(`/users/${identifier}/outbox`, "https://example.com"),
    ),
    parseUri: vi.fn((url: URL) => ({ type: "actor", identifier: url.pathname.split("/").at(-1) })),
    sendActivity: vi.fn(),
  };

  return ctx as typeof ctx & Context<unknown> & InboxContext<unknown> & RequestContext<unknown>;
}

export function createRemoteActor(uri = "https://remote.test/users/bob") {
  return new Person({
    id: new URL(uri),
    preferredUsername: "bob",
    inbox: new URL("https://remote.test/users/bob/inbox"),
  });
}
