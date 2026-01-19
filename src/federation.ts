import {
  Accept,
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
  isActor,
  Mention,
  Note,
  Person,
  PUBLIC_COLLECTION,
  Recipient,
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
import { getTagFromNote, upsertActor } from "./lib/utils-federation";

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

federation
  .setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    log(`Dispatching actor for identifier: ${identifier}`);

    const actor = await prisma.actor.findFirst({
      where: { username: identifier },
      include: { avatar: true, banner: true },
    });

    if (!actor) {
      return null;
    }

    const keys = await ctx.getActorKeyPairs(identifier);

    return new Person({
      id: new URL(actor.uri),
      preferredUsername: identifier,
      name: actor.name,
      summary: actor.summary,
      inbox: new URL(actor.inboxUrl),
      endpoints: new Endpoints({
        sharedInbox: new URL(actor.sharedInboxUrl!),
      }),
      url: new URL(actor.uri),
      publicKey: keys[0].cryptographicKey,
      assertionMethods: keys.map((k) => k.multikey),
      followers: ctx.getFollowersUri(identifier),
      icon: new Image({
        url: actor.avatar?.url ? new URL(actor.avatar?.url) : undefined,
      }),
      image: new Image({
        url: actor.banner?.url ? new URL(actor.banner?.url) : undefined,
      }),
    });
  })
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    log(`Dispatching key pairs for identifier: ${identifier}`);

    const actor = await prisma.actor.findFirst({
      where: { username: identifier },
      include: { keys: true },
    });

    if (!actor) {
      return [];
    }

    const keys = Object.fromEntries(
      actor?.keys.map((k) => [k.type, k]),
    ) as Record<Key["type"], Key>;
    const pairs: CryptoKeyPair[] = [];

    // 사용자가 지원하는 두 키 형식 (RSASSA-PKCS1-v1_5 및 Ed25519) 각각에 대해
    // 키 쌍을 보유하고 있는지 확인하고, 없으면 생성 후 데이터베이스에 저장:
    for (const keyType of ["RSASSA-PKCS1-v1_5", "Ed25519"] as const) {
      if (keys[keyType] == null) {
        log(
          `The user ${identifier} does not have an ${keyType} key; creating one...`,
        );
        const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
        await prisma.keys.create({
          data: {
            actorId: actor.id,
            type: keyType,
            privateKey: JSON.stringify(await exportJwk(privateKey)),
            publicKey: JSON.stringify(await exportJwk(publicKey)),
          },
        });
        pairs.push({ privateKey, publicKey });
      } else {
        pairs.push({
          privateKey: await importJwk(
            JSON.parse(keys[keyType].privateKey),
            "private",
          ),
          publicKey: await importJwk(
            JSON.parse(keys[keyType].publicKey),
            "public",
          ),
        });
      }
    }

    return pairs;
  });

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

    await prisma.follows.create({
      data: {
        followingId,
        followerId,
      },
    });

    const accept = new Accept({
      actor: follow.objectId,
      to: follow.actorId,
      object: follow,
    });
    await ctx.sendActivity(object, follower, accept);
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

    log(
      `Processing unfollow from ${followerActor?.handle} to @${followingActor?.handle}`,
    );

    await prisma.follows.delete({
      where: {
        followingId_followerId: {
          followingId: followingActor.id,
          followerId: followerActor.id,
        },
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

      const tags = (await object.toJsonLd()) as
        | {
            tag?: { type: string; href: string; name: string }[];
          }
        | { type: string; href: string; name: string };

      const mentions = getTagFromNote(object);

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

      await prisma.comment.update({
        where: { id: comment.id },
        data: {
          content,
          url: object.url?.href?.toString(),
        },
      });

      log(`Updated comment: ${comment.id}`);
      return;
    }

    if (isActor(object)) {
      if (update.actorId?.href !== object.id?.href) {
        log(
          "Unauthorized actor update attempt: Actor can only update themselves",
        );
        return;
      }

      await upsertActor(object);
      log(`Updated actor profile: ${object.id?.href}`);
      return;
    }
  });

federation
  .setFollowersDispatcher(
    "/users/{identifier}/followers",
    async (ctx, identifier) => {
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
    },
  )
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
  const uuidPattern =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
      replyTarget: comment.parent
        ? new URL(comment.parent.uri)
        : new URL(comment.post.uri),
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
        post.publishedAt
          ? post.publishedAt.toISOString()
          : post.createdAt.toISOString(),
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
