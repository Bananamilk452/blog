import {
  Accept,
  createFederation,
  Endpoints,
  exportJwk,
  Follow,
  generateCryptoKeyPair,
  getActorHandle,
  importJwk,
  Person,
} from "@fedify/fedify";
import { RedisKvStore, RedisMessageQueue } from "@fedify/redis";
import { Redis } from "ioredis";

import { Keys as Key } from "./generated/prisma";
import { prisma } from "./lib/prisma";

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
    const user = await prisma.user.findFirst({
      where: { username: identifier },
      include: { actor: true },
    });

    if (!user) {
      return null;
    }

    const keys = await ctx.getActorKeyPairs(identifier);

    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: user.name,
      inbox: ctx.getInboxUri(identifier),
      endpoints: new Endpoints({
        sharedInbox: ctx.getInboxUri(),
      }),
      url: ctx.getActorUri(identifier),
      publicKey: keys[0].cryptographicKey,
      assertionMethods: keys.map((k) => k.multikey),
    });
  })
  .setKeyPairsDispatcher(async (ctx, identifier) => {
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
        console.log(
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
    if (follow.objectId == null) {
      console.log("The Follow object does not have an object:", follow);
      return;
    }

    const object = ctx.parseUri(follow.objectId);
    if (object == null || object.type !== "actor") {
      console.log("The Follow object's object is not an actor:", follow);
      return;
    }

    const follower = await follow.getActor();
    if (follower?.id == null || follower.inboxId == null) {
      console.log("The Follow object does not have an actor:", follow);
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
      console.log(
        "Failed to find the actor to follow in the database:",
        object,
      );
      return;
    }

    const followerId = (
      await prisma.actor.upsert({
        where: { uri: follower.id.href },
        create: {
          uri: follower.id.href,
          handle: await getActorHandle(follower),
          name: follower.name?.toString(),
          inboxUrl: follower.inboxId.href,
          sharedInboxUrl: follower.endpoints?.sharedInbox?.href,
          url: follower.url?.href?.toString(),
        },
        update: {
          handle: await getActorHandle(follower),
          name: follower.name?.toString(),
          inboxUrl: follower.inboxId.href,
          sharedInboxUrl: follower.endpoints?.sharedInbox?.href,
          url: follower.url?.href?.toString(),
        },
      })
    ).id;

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
  });

export { federation };
