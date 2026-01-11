import {
  Accept,
  Create,
  createFederation,
  Document,
  Endpoints,
  exportJwk,
  Follow,
  generateCryptoKeyPair,
  Image,
  importJwk,
  isActor,
  Note,
  Person,
  PUBLIC_COLLECTION,
  Recipient,
  Undo,
} from "@fedify/fedify";
import { RedisKvStore, RedisMessageQueue } from "@fedify/redis";
import { Temporal } from "@js-temporal/polyfill";
import { format } from "date-fns";
import debug from "debug";
import { Redis } from "ioredis";

import { Keys as Key } from "./generated/prisma";
import { prisma } from "./lib/prisma";
import { upsertActor } from "./lib/utils-federation";

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

    const user = await prisma.user.findFirst({
      where: { username: identifier },
      include: {
        actor: {
          include: {
            avatar: true,
            banner: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const keys = await ctx.getActorKeyPairs(identifier);

    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: user.actor?.name,
      summary: user.actor?.summary,
      inbox: ctx.getInboxUri(identifier),
      endpoints: new Endpoints({
        sharedInbox: ctx.getInboxUri(),
      }),
      url: ctx.getActorUri(identifier),
      publicKey: keys[0].cryptographicKey,
      assertionMethods: keys.map((k) => k.multikey),
      followers: ctx.getFollowersUri(identifier),
      icon: new Image({
        url: user.actor?.avatar?.url
          ? new URL(user.actor?.avatar?.url)
          : undefined,
      }),
      image: new Image({
        url: user.actor?.banner?.url
          ? new URL(user.actor?.banner?.url)
          : undefined,
      }),
    });
  })
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    log(`Dispatching key pairs for identifier: ${identifier}`);

    const user = await prisma.user.findFirst({
      where: { username: identifier },
      include: { keys: true },
    });

    if (!user) {
      return [];
    }

    const keys = Object.fromEntries(
      user?.keys.map((k) => [k.type, k]),
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
            userId: user.id,
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
    log(`Received Create activity: ${create.id?.href}`);

    const object = await create.getObject();
    if (!(object instanceof Note)) return;

    const actor = create.actorId;
    if (actor == null) return;

    const author = await object.getAttribution();
    if (!isActor(author) || author.id?.href !== actor.href) return;

    // replyTargetId가 있어야 댓글로 처리
    const replyTargetId = object.replyTargetId;
    if (replyTargetId == null) {
      log("The Note does not have an replyTargetId, skipping");
      return;
    }

    // 먼저 포스트에 대한 댓글인지 확인
    const post = await prisma.posts.findFirst({
      where: { uri: replyTargetId.href },
    });

    // 기존 댓글에 대한 답글인지 확인
    const parentComment = await prisma.comment.findFirst({
      where: { uri: replyTargetId.href },
    });

    // 포스트도 아니고 댓글도 아니면 무시
    if (!post && !parentComment) {
      log("replyTargetId target not found in posts or comments");
      return;
    }

    // actor 저장
    const actorRecord = await upsertActor(author);
    if (!actorRecord) return;

    if (object.id == null) return;
    const content = object.content?.toString() || "";

    // 댓글 저장 (대댓글인 경우 parentId와 해당 댓글의 postId 사용)
    await prisma.comment.create({
      data: {
        uri: object.id.href,
        actorId: actorRecord.id,
        postId: post?.id ?? parentComment!.postId,
        parentId: parentComment?.id ?? null,
        content,
        url: object.url?.href?.toString(),
      },
    });

    log(`Saved comment: ${object.id.href}`);
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

federation.setObjectDispatcher(
  Note,
  "/users/{identifier}/posts/{id}",
  async (ctx, values) => {
    log(
      `Dispatching Note object for identifier: ${values.identifier}, id: ${values.id}`,
    );

    const post = await prisma.posts.findFirst({
      where: {
        id: values.id,
      },
      include: {
        user: true,
        banner: true,
      },
    });

    if (!post) return null;

    const content = `${post.title}<br /><br />${post.user.name} - 마지막 수정 ${format(post.updatedAt, "yyyy/MM/dd")}<br /><br />${post.content}`;

    return new Note({
      id: ctx.getObjectUri(Note, values),
      attribution: ctx.getActorUri(values.identifier),
      to: PUBLIC_COLLECTION,
      cc: ctx.getFollowersUri(values.identifier),
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
  },
);
export { federation };
