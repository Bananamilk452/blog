import { Article, Create, Delete, Follow, Undo, Update, createFederation } from "@fedify/fedify";
import { RedisKvStore, RedisMessageQueue } from "@fedify/redis";
import { Redis } from "ioredis";

import { countFollowers } from "./federation/countFollowers";
import { countOutboxItems } from "./federation/countOutboxItems";
import { dispatchActor } from "./federation/dispatchActor";
import { dispatchArticle } from "./federation/dispatchArticle";
import { dispatchFollowers } from "./federation/dispatchFollowers";
import { dispatchKeyPairs } from "./federation/dispatchKeyPairs";
import { dispatchOutbox } from "./federation/dispatchOutbox";
import { handleCreate } from "./federation/handleCreate";
import { handleDelete } from "./federation/handleDelete";
import { handleFollow } from "./federation/handleFollow";
import { handleUndo } from "./federation/handleUndo";
import { handleUpdate } from "./federation/handleUpdate";

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
  .setActorDispatcher("/users/{identifier}", dispatchActor)
  .setKeyPairsDispatcher(dispatchKeyPairs);

federation
  .setOutboxDispatcher("/users/{identifier}/outbox", dispatchOutbox)
  .setCounter(countOutboxItems);

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, handleFollow)
  .on(Undo, handleUndo)
  .on(Create, handleCreate)
  .on(Delete, handleDelete)
  .on(Update, handleUpdate);

federation
  .setFollowersDispatcher("/users/{identifier}/followers", dispatchFollowers)
  .setCounter(countFollowers);

federation.setObjectDispatcher(Article, "/post/{slug}", dispatchArticle);

export { federation };
