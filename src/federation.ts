import {
  Accept,
  ActorKeyPair,
  Context,
  Create,
  createFederation,
  Delete,
  Document,
  Endpoints,
  exportJwk,
  Follow,
  generateCryptoKeyPair,
  Image,
  importJwk,
  InboxContext,
  isActor,
  Mention,
  Note,
  Person,
  PUBLIC_COLLECTION,
  Recipient,
  RequestContext,
  Undo,
  Update,
} from "@fedify/fedify";
import { RedisKvStore, RedisMessageQueue } from "@fedify/redis";
import { Temporal } from "@js-temporal/polyfill";
import { format } from "date-fns";
import debug from "debug";
import { Redis } from "ioredis";

import { Keys as Key } from "./generated/prisma";
import { prisma } from "./lib/prisma";
import { getTagFromNote, isUniqueConstraintError, upsertActor } from "./lib/utils-federation";

const log = debug("blog:federation");

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined");
}

const federation = createFederation({
  kv: new RedisKvStore(new Redis(redisUrl)),
  queue: new RedisMessageQueue(() => new Redis(redisUrl)),
  origin: new URL(process.env.PUBLIC_URL!).origin,
});

export async function dispatchActor(ctx: RequestContext<unknown>, identifier: string) {
  log(`Dispatching actor for identifier: ${identifier}`);

  const actor = await prisma.actor.findFirst({
    where: { username: identifier, userId: { not: null } },
    include: { avatar: true, banner: true },
  });

  if (!actor) return null;

  const keys = await ctx.getActorKeyPairs(identifier);

  return new Person({
    id: new URL(actor.uri),
    preferredUsername: identifier,
    name: actor.name,
    summary: actor.summary,
    inbox: new URL(actor.inboxUrl),
    outbox: ctx.getOutboxUri(identifier),
    endpoints: actor.sharedInboxUrl
      ? new Endpoints({
          sharedInbox: new URL(actor.sharedInboxUrl),
        })
      : undefined,
    url: new URL(actor.uri),
    publicKey: keys[0]?.cryptographicKey,
    assertionMethods: keys.map((k: ActorKeyPair) => k.multikey),
    followers: ctx.getFollowersUri(identifier),
    icon: new Image({
      url: actor.avatar?.url ? new URL(actor.avatar?.url) : undefined,
    }),
    image: new Image({
      url: actor.banner?.url ? new URL(actor.banner?.url) : undefined,
    }),
  });
}

export async function dispatchKeyPairs(_ctx: Context<unknown>, identifier: string) {
  log(`Dispatching key pairs for identifier: ${identifier}`);

  const actor = await prisma.actor.findFirst({
    where: { username: identifier, userId: { not: null } },
    include: { keys: true },
  });

  if (!actor) return [];

  const keys = Object.fromEntries(actor.keys.map((k) => [k.type, k])) as Record<Key["type"], Key>;
  const pairs: CryptoKeyPair[] = [];

  for (const keyType of ["RSASSA-PKCS1-v1_5", "Ed25519"] as const) {
    if (keys[keyType] == null) {
      log(`The user ${identifier} does not have an ${keyType} key; creating one...`);
      const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
      const key = await prisma.keys.upsert({
        where: {
          actorId_type: {
            actorId: actor.id,
            type: keyType,
          },
        },
        create: {
          actorId: actor.id,
          type: keyType,
          privateKey: JSON.stringify(await exportJwk(privateKey)),
          publicKey: JSON.stringify(await exportJwk(publicKey)),
        },
        update: {},
      });
      pairs.push({
        privateKey: await importJwk(JSON.parse(key.privateKey), "private"),
        publicKey: await importJwk(JSON.parse(key.publicKey), "public"),
      });
    } else {
      pairs.push({
        privateKey: await importJwk(JSON.parse(keys[keyType].privateKey), "private"),
        publicKey: await importJwk(JSON.parse(keys[keyType].publicKey), "public"),
      });
    }
  }

  return pairs;
}

export async function handleFollow(ctx: InboxContext<unknown>, follow: Follow) {
  log(`Received Follow activity: ${follow.id?.href}`);

  if (follow.objectId == null) {
    log("The Follow object does not have an object:", follow);
    return;
  }

  const object = ctx.parseUri(follow.objectId);
  if (object == null || object.type !== "actor") {
    log("The Follow object's object is not an actor:", follow);
    return;
  }

  const follower = await follow.getActor();
  if (follower?.id == null || follower.inboxId == null) {
    log("The Follow object does not have an actor:", follow);
    return;
  }

  const followingId = (
    await prisma.actor.findFirst({
      where: {
        user: {
          username: object.identifier,
        },
      },
    })
  )?.id;

  if (followingId == null) {
    log("Failed to find the actor to follow in the database:", object);
    return;
  }

  const followerId = (await upsertActor(follower)).id;

  try {
    await prisma.follows.create({
      data: {
        followingId,
        followerId,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      log("Error creating follow relationship:", error);
      return;
    }

    log("Follow relationship already exists; accepting again:", error);
  }

  await ctx.sendActivity(
    { identifier: object.identifier },
    follower,
    new Accept({
      actor: follow.objectId,
      to: follow.actorId,
      object: follow,
    }),
    { immediate: true },
  );
}

export async function handleUndo(ctx: InboxContext<unknown>, undo: Undo) {
  log(`Received Undo activity: ${undo.id?.href}`);

  const object = await undo.getObject();
  if (!(object instanceof Follow)) return;
  if (undo.actorId == null || object.objectId == null) return;
  const parsed = ctx.parseUri(object.objectId);
  if (parsed == null || parsed.type !== "actor") return;

  const followingActor = await prisma.actor.findFirst({
    where: {
      user: {
        username: parsed.identifier,
      },
    },
  });

  const followerActor = await prisma.actor.findFirst({
    where: {
      uri: undo.actorId.href,
    },
  });

  if (!followingActor || !followerActor) {
    log("Either following or follower actor not found.");
    return;
  }

  await prisma.follows.deleteMany({
    where: {
      followingId: followingActor.id,
      followerId: followerActor.id,
    },
  });
}

async function formatNoteAttachments(note: Note) {
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
}

export async function handleCreate(ctx: InboxContext<unknown>, create: Create) {
  try {
    log(`Received Create activity: ${create.id?.href}`);

    const object = await create.getObject();
    if (!(object instanceof Note)) return;

    const actor = create.actorId;
    if (actor == null) return;

    const author = await object.getAttribution();
    if (!isActor(author) || author.id?.href !== actor.href) return;

    const replyTarget = await object.getReplyTarget();
    if (replyTarget == null || !(replyTarget instanceof Note)) {
      log("The Note does not have an replyTarget, skipping");
      return;
    }

    const uri = replyTarget.id?.toString();
    const post = await prisma.posts.findFirst({ where: { uri } });
    const parentComment = await prisma.comment.findFirst({ where: { uri } });

    if (!post && !parentComment) {
      log("replyTarget target not found in posts or comments");
      return;
    }

    const actorRecord = await upsertActor(author);
    if (!actorRecord || object.id == null) return;

    try {
      await prisma.comment.create({
        data: {
          uri: object.id.href,
          actorId: actorRecord.id,
          postId: post?.id ?? parentComment!.postId,
          parentId: parentComment?.id ?? null,
          content: object.content?.toString() || "",
          url: object.url?.href?.toString(),
          to: object.toIds.map((to) => to.href),
          cc: object.ccIds.map((cc) => cc.href),
          mentions: getTagFromNote(object),
          attachment: { createMany: { data: await formatNoteAttachments(object) } },
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        log(`Comment already exists, skipping duplicate Create: ${object.id.href}`);
        return;
      }
      throw error;
    }

    log(`Saved comment: ${object.id.href}`);
  } catch (error) {
    log("Error processing Create activity:", error);
  }
}

export async function handleDelete(_ctx: InboxContext<unknown>, del: Delete) {
  log(`Received Delete activity: ${del.id?.href}`);

  const objectId = del.objectId;
  if (objectId == null) {
    log("The Delete object does not have an objectId:", del);
    return;
  }

  const comment = await prisma.comment.findFirst({
    where: { uri: objectId.href },
    include: { actor: true },
  });

  if (!comment) {
    log(`Comment not found for deletion: ${objectId.href}`);
    return;
  }

  if (del.actorId?.href !== comment.actor.uri) {
    log(
      `Unauthorized delete attempt. Request actor: ${del.actorId?.href}, Comment actor: ${comment.actor.uri}`,
    );
    return;
  }

  await prisma.comment.delete({ where: { id: comment.id } });
  log(`Deleted comment: ${comment.id}`);
}

export async function handleUpdate(_ctx: InboxContext<unknown>, update: Update) {
  log(`Received Update activity: ${update.id?.href}`);

  const object = await update.getObject();
  if (!object) return;

  if (object instanceof Note) {
    if (object.id == null) return;

    const comment = await prisma.comment.findFirst({
      where: { uri: object.id.href },
      include: { actor: true },
    });

    if (!comment) {
      log(`Comment not found for update: ${object.id.href}`);
      return;
    }

    if (update.actorId?.href !== comment.actor.uri) {
      log(
        `Unauthorized update attempt. Request actor: ${update.actorId?.href}, Comment actor: ${comment.actor.uri}`,
      );
      return;
    }

    await prisma.comment.update({
      where: { id: comment.id },
      data: {
        content: object.content?.toString() || "",
        url: object.url?.href?.toString(),
        to: object.toIds.map((to) => to.href),
        cc: object.ccIds.map((cc) => cc.href),
        mentions: getTagFromNote(object),
        attachment: {
          deleteMany: {},
          createMany: { data: await formatNoteAttachments(object) },
        },
      },
    });

    log(`Updated comment: ${comment.id}`);
    return;
  }

  if (isActor(object)) {
    if (update.actorId?.href !== object.id?.href) {
      log("Unauthorized actor update attempt: Actor can only update themselves");
      return;
    }

    await upsertActor(object);
    log(`Updated actor profile: ${object.id?.href}`);
  }
}

export async function dispatchFollowers(_ctx: Context<unknown>, identifier: string) {
  log(`Dispatching followers for identifier: ${identifier}`);

  const followers = await prisma.follows.findMany({
    where: {
      following: {
        user: {
          username: identifier,
        },
      },
    },
    include: {
      follower: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const items: Recipient[] = followers.map((f) => ({
    id: new URL(f.follower.uri),
    inboxId: new URL(f.follower.inboxUrl),
    endpoints:
      f.follower.sharedInboxUrl == null
        ? null
        : { sharedInbox: new URL(f.follower.sharedInboxUrl) },
  }));

  return { items };
}

export async function countFollowers(_ctx: RequestContext<unknown>, identifier: string) {
  log(`Counting followers for identifier: ${identifier}`);

  return await prisma.follows.count({
    where: {
      following: {
        user: {
          username: identifier,
        },
      },
    },
  });
}

export async function dispatchOutbox(ctx: RequestContext<unknown>, identifier: string) {
  log(`Dispatching outbox for identifier: ${identifier}`);

  const posts = await prisma.posts.findMany({
    where: {
      state: "published",
      slug: { not: null },
      actor: {
        username: identifier,
        userId: { not: null },
      },
    },
    orderBy: { publishedAt: "desc" },
    select: { slug: true },
  });

  const items = (
    await Promise.all(
      posts.map(async (post) => {
        if (post.slug == null) return null;

        const note = await ctx.getObject(Note, { slug: post.slug });
        if (!note) return null;

        return new Create({
          id: new URL("#activity", note.id ?? undefined),
          actors: note.attributionIds,
          tos: note.toIds,
          ccs: note.ccIds,
          object: note,
        });
      }),
    )
  ).filter((item) => item != null);

  return { items };
}

export async function countOutboxItems(_ctx: RequestContext<unknown>, identifier: string) {
  log(`Counting outbox items for identifier: ${identifier}`);

  return await prisma.posts.count({
    where: {
      state: "published",
      slug: { not: null },
      actor: {
        username: identifier,
        userId: { not: null },
      },
    },
  });
}

export async function dispatchNote(ctx: RequestContext<unknown>, values: { slug: string }) {
  log(`Dispatching Note object for slug: ${values.slug}`);

  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isComment = uuidPattern.test(values.slug);
  if (isComment) {
    const commentUri = ctx.getObjectUri(Note, values).href;
    const comment = await prisma.comment.findFirst({
      where: { uri: commentUri },
      include: {
        actor: true,
        attachment: true,
        post: true,
        parent: {
          select: {
            uri: true,
          },
        },
      },
    });

    if (!comment) {
      log(`Comment not found for URI: ${commentUri}`);
      return null;
    }

    return new Note({
      id: new URL(comment.uri),
      attribution: new URL(comment.actor.uri),
      tos: comment.to.map((uri) => new URL(uri)),
      ccs: comment.cc.map((uri) => new URL(uri)),
      tags: (comment.mentions as { href: string; name: string }[]).map(
        (mention) =>
          new Mention({
            id: new URL(mention.href),
            name: mention.name,
          }),
      ),
      content: comment.content,
      mediaType: "text/html",
      replyTarget: comment.parent ? new URL(comment.parent.uri) : new URL(comment.post.uri),
      attachments: comment.attachment.map(
        (att) =>
          new Document({
            url: new URL(att.url),
            mediaType: att.mediaType ?? undefined,
          }),
      ),
      published: Temporal.Instant.from(comment.createdAt.toISOString()),
      url: new URL(comment.url ?? comment.uri),
    });
  }

  const post = await prisma.posts.findFirst({
    where: {
      slug: values.slug,
    },
    include: {
      user: true,
      banner: true,
      actor: true,
    },
  });

  if (!post) return null;

  const content = `<a href="${post.uri}">${post.title}</a> (작성자: ${post.user.name} - 마지막 수정 ${format(post.updatedAt, "yyyy/MM/dd")})<br />${post.content}`;

  return new Note({
    id: ctx.getObjectUri(Note, values),
    attribution: ctx.getActorUri(post.actor.username),
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(post.actor.username),
    content,
    mediaType: "text/html",
    published: Temporal.Instant.from(
      post.publishedAt ? post.publishedAt.toISOString() : post.createdAt.toISOString(),
    ),
    url: ctx.getObjectUri(Note, values),
    attachments: post.banner
      ? [
          new Document({
            url: new URL(post.banner.url),
          }),
        ]
      : undefined,
  });
}

federation
  .setActorDispatcher("/users/{identifier}", dispatchActor)
  .setKeyPairsDispatcher(dispatchKeyPairs);

federation
  .setOutboxDispatcher("/users/{identifier}/outbox", dispatchOutbox)
  .setCounter(countOutboxItems);

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    log(`Received Follow activity: ${follow.id?.href}`);

    if (follow.objectId == null) {
      log("The Follow object does not have an object:", follow);
      return;
    }

    const object = ctx.parseUri(follow.objectId);
    if (object == null || object.type !== "actor") {
      log("The Follow object's object is not an actor:", follow);
      return;
    }

    const follower = await follow.getActor();
    if (follower?.id == null || follower.inboxId == null) {
      log("The Follow object does not have an actor:", follow);
      return;
    }

    log(
      `Processing follow from @${follower.preferredUsername}@${follower.id.hostname} to @${object.handle}`,
    );

    const followingId = (
      await prisma.actor.findFirst({
        where: {
          user: {
            username: object.identifier,
          },
        },
      })
    )?.id;

    if (followingId == null) {
      log("Failed to find the actor to follow in the database:", object);
      return;
    }

    const followerId = (await upsertActor(follower)).id;

    try {
      await prisma.follows.create({
        data: {
          followingId,
          followerId,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        log("Error creating follow relationship:", error);
        return;
      }

      log("Follow relationship already exists; accepting again:", error);

      const accept = new Accept({
        actor: follow.objectId,
        to: follow.actorId,
        object: follow,
      });
      await ctx.sendActivity(
        {
          identifier: object.identifier,
        },
        follower,
        accept,
        { immediate: true },
      );
      return;
    }

    const accept = new Accept({
      actor: follow.objectId,
      to: follow.actorId,
      object: follow,
    });
    await ctx.sendActivity(
      {
        identifier: object.identifier,
      },
      follower,
      accept,
      { immediate: true },
    );
  })
  .on(Undo, async (ctx, undo) => {
    log(`Received Undo activity: ${undo.id?.href}`);

    const object = await undo.getObject();
    if (!(object instanceof Follow)) return;
    if (undo.actorId == null || object.objectId == null) return;
    const parsed = ctx.parseUri(object.objectId);
    if (parsed == null || parsed.type !== "actor") return;

    const followingActor = await prisma.actor.findFirst({
      where: {
        user: {
          username: parsed.identifier,
        },
      },
    });

    const followerActor = await prisma.actor.findFirst({
      where: {
        uri: undo.actorId.href,
      },
    });

    if (!followingActor || !followerActor) {
      log("Either following or follower actor not found.");
      return;
    }

    log(`Processing unfollow from ${followerActor?.handle} to @${followingActor?.handle}`);

    await prisma.follows.deleteMany({
      where: {
        followingId: followingActor.id,
        followerId: followerActor.id,
      },
    });
  })
  .on(Create, async (ctx, create) => {
    try {
      log(`Received Create activity: ${create.id?.href}`);

      const object = await create.getObject();
      if (!(object instanceof Note)) return;

      const actor = create.actorId;
      if (actor == null) return;

      const author = await object.getAttribution();
      if (!isActor(author) || author.id?.href !== actor.href) return;

      // replyTarget가 있어야 댓글로 처리
      const replyTarget = await object.getReplyTarget();
      if (replyTarget == null || !(replyTarget instanceof Note)) {
        log("The Note does not have an replyTarget, skipping");
        return;
      }

      const uri = replyTarget.id?.toString();

      // 먼저 포스트에 대한 댓글인지 확인
      const post = await prisma.posts.findFirst({
        where: { uri },
      });

      // 기존 댓글에 대한 답글인지 확인
      const parentComment = await prisma.comment.findFirst({
        where: { uri },
      });

      // 포스트도 아니고 댓글도 아니면 무시
      if (!post && !parentComment) {
        log("replyTarget target not found in posts or comments");
        return;
      }

      // actor 저장
      const actorRecord = await upsertActor(author);
      if (!actorRecord) return;

      if (object.id == null) return;
      const content = object.content?.toString() || "";
      const attachments = object.getAttachments();

      const formattedAttachments = [];

      for await (const attachment of attachments) {
        if (attachment instanceof Document) {
          formattedAttachments.push({
            url: attachment.url?.toString() || "",
            mediaType: attachment.mediaType,
            sensitive: attachment.sensitive || false,
            name: attachment.name?.toString(),
          });
        }
      }

      const mentions = getTagFromNote(object);

      try {
        // 댓글 저장 (대댓글인 경우 parentId와 해당 댓글의 postId 사용)
        await prisma.comment.create({
          data: {
            uri: object.id.href,
            actorId: actorRecord.id,
            postId: post?.id ?? parentComment!.postId,
            parentId: parentComment?.id ?? null,
            content,
            url: object.url?.href?.toString(),
            to: object.toIds.map((to) => to.href),
            cc: object.ccIds.map((cc) => cc.href),
            mentions,
            attachment: { createMany: { data: formattedAttachments } },
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          log(`Comment already exists, skipping duplicate Create: ${object.id.href}`);
          return;
        }
        throw error;
      }

      log(`Saved comment: ${object.id.href}`);
    } catch (error) {
      log("Error processing Create activity:", error);
    }
  })
  .on(Delete, async (ctx, del) => {
    log(`Received Delete activity: ${del.id?.href}`);

    const objectId = del.objectId;
    if (objectId == null) {
      log("The Delete object does not have an objectId:", del);
      return;
    }

    const comment = await prisma.comment.findFirst({
      where: { uri: objectId.href },
      include: { actor: true },
    });

    if (!comment) {
      log(`Comment not found for deletion: ${objectId.href}`);
      return;
    }

    if (del.actorId?.href !== comment.actor.uri) {
      log(
        `Unauthorized delete attempt. Request actor: ${del.actorId?.href}, Comment actor: ${comment.actor.uri}`,
      );
      return;
    }

    await prisma.comment.delete({
      where: { id: comment.id },
    });

    log(`Deleted comment: ${comment.id}`);
  })
  .on(Update, async (ctx, update) => {
    log(`Received Update activity: ${update.id?.href}`);

    const object = await update.getObject();
    if (!object) return;

    if (object instanceof Note) {
      if (object.id == null) return;

      const comment = await prisma.comment.findFirst({
        where: { uri: object.id.href },
        include: { actor: true },
      });

      if (!comment) {
        log(`Comment not found for update: ${object.id.href}`);
        return;
      }

      if (update.actorId?.href !== comment.actor.uri) {
        log(
          `Unauthorized update attempt. Request actor: ${update.actorId?.href}, Comment actor: ${comment.actor.uri}`,
        );
        return;
      }

      const content = object.content?.toString() || "";
      const attachments = object.getAttachments();
      const formattedAttachments = [];

      for await (const attachment of attachments) {
        if (attachment instanceof Document) {
          formattedAttachments.push({
            url: attachment.url?.toString() || "",
            mediaType: attachment.mediaType,
            sensitive: attachment.sensitive || false,
            name: attachment.name?.toString(),
          });
        }
      }

      await prisma.comment.update({
        where: { id: comment.id },
        data: {
          content,
          url: object.url?.href?.toString(),
          to: object.toIds.map((to) => to.href),
          cc: object.ccIds.map((cc) => cc.href),
          mentions: getTagFromNote(object),
          attachment: {
            deleteMany: {},
            createMany: { data: formattedAttachments },
          },
        },
      });

      log(`Updated comment: ${comment.id}`);
      return;
    }

    if (isActor(object)) {
      if (update.actorId?.href !== object.id?.href) {
        log("Unauthorized actor update attempt: Actor can only update themselves");
        return;
      }

      await upsertActor(object);
      log(`Updated actor profile: ${object.id?.href}`);
      return;
    }
  });

federation
  .setFollowersDispatcher("/users/{identifier}/followers", async (ctx, identifier) => {
    log(`Dispatching followers for identifier: ${identifier}`);

    const followers = await prisma.follows.findMany({
      where: {
        following: {
          user: {
            username: identifier,
          },
        },
      },
      include: {
        follower: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    const items: Recipient[] = followers.map((f) => ({
      id: new URL(f.follower.uri),
      inboxId: new URL(f.follower.inboxUrl),
      endpoints:
        f.follower.sharedInboxUrl == null
          ? null
          : { sharedInbox: new URL(f.follower.sharedInboxUrl) },
    }));
    return { items };
  })
  .setCounter(async (ctx, identifier) => {
    log(`Counting followers for identifier: ${identifier}`);

    const result = await prisma.follows.count({
      where: {
        following: {
          user: {
            username: identifier,
          },
        },
      },
    });
    return result;
  });

federation.setObjectDispatcher(Note, "/post/{slug}", async (ctx, values) => {
  log(`Dispatching Note object for slug: ${values.slug}`);

  // Check if slug contains UUID pattern (comment vs post)
  // Comment slug format: postSlug-uuid
  // UUID pattern: 8-4-4-4-12 hex digits
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isComment = uuidPattern.test(values.slug);
  if (isComment) {
    // Handle comment
    log(`Detected comment slug: ${values.slug}`);

    const commentUri = ctx.getObjectUri(Note, values).href;
    const comment = await prisma.comment.findFirst({
      where: { uri: commentUri },
      include: {
        actor: true,
        attachment: true,
        post: true,
        parent: {
          select: {
            uri: true,
          },
        },
      },
    });

    if (!comment) {
      log(`Comment not found for URI: ${commentUri}`);
      return null;
    }

    const toRecipients = comment.to.map((uri) => new URL(uri));
    const ccRecipients = comment.cc.map((uri) => new URL(uri));

    return new Note({
      id: new URL(comment.uri),
      attribution: new URL(comment.actor.uri),
      tos: toRecipients,
      ccs: ccRecipients,
      tags: (comment.mentions as { href: string; name: string }[]).map(
        (mention) =>
          new Mention({
            id: new URL(mention.href),
            name: mention.name,
          }),
      ),
      content: comment.content,
      mediaType: "text/html",
      replyTarget: comment.parent ? new URL(comment.parent.uri) : new URL(comment.post.uri),
      attachments: comment.attachment.map(
        (att) =>
          new Document({
            url: new URL(att.url),
            mediaType: att.mediaType ?? undefined,
          }),
      ),
      published: Temporal.Instant.from(comment.createdAt.toISOString()),
      url: new URL(comment.url ?? comment.uri),
    });
  } else {
    // Handle post (existing logic)
    const post = await prisma.posts.findFirst({
      where: {
        slug: values.slug,
      },
      include: {
        user: true,
        banner: true,
        actor: true,
      },
    });

    if (!post) return null;

    const content = `<a href="${post.uri}">${post.title}</a> (작성자: ${post.user.name} - 마지막 수정 ${format(post.updatedAt, "yyyy/MM/dd")})<br />${post.content}`;

    return new Note({
      id: ctx.getObjectUri(Note, values),
      attribution: ctx.getActorUri(post.actor.username),
      to: PUBLIC_COLLECTION,
      cc: ctx.getFollowersUri(post.actor.username),
      content,
      mediaType: "text/html",
      published: Temporal.Instant.from(
        post.publishedAt ? post.publishedAt.toISOString() : post.createdAt.toISOString(),
      ),
      url: ctx.getObjectUri(Note, values),
      attachments: post.banner
        ? [
            new Document({
              url: new URL(post.banner.url),
            }),
          ]
        : undefined,
    });
  }
});
export { federation };
