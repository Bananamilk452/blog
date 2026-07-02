import { createFederation } from "@fedify/fedify";
import { RedisKvStore, RedisMessageQueue } from "@fedify/redis";
import {
  Create,
  Delete,
  EmojiReact,
  Follow,
  Like,
  Note,
  QuoteAuthorization,
  QuoteRequest,
  Undo,
  Update,
} from "@fedify/vocab";
import { Redis } from "ioredis";

import { countFollowers } from "./federation/countFollowers";
import { countOutboxItems } from "./federation/countOutboxItems";
import { dispatchActor } from "./federation/dispatchActor";
import { dispatchFollowers } from "./federation/dispatchFollowers";
import { dispatchKeyPairs } from "./federation/dispatchKeyPairs";
import { dispatchNote } from "./federation/dispatchNote";
import { dispatchOutbox } from "./federation/dispatchOutbox";
import { handleCreate } from "./federation/handleCreate";
import { handleDelete } from "./federation/handleDelete";
import { handleFollow } from "./federation/handleFollow";
import { handleQuoteRequest } from "./federation/handleQuoteRequest";
import { handleReaction } from "./federation/handleReaction";
import { handleUndo } from "./federation/handleUndo";
import { handleUpdate } from "./federation/handleUpdate";
import { logInboxActivity } from "./federation/logInboxActivity";
import { dispatchQuoteAuthorization } from "./federation/quoteAuthorization";

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
  .on(Follow, logInboxActivity(handleFollow))
  .on(Undo, logInboxActivity(handleUndo))
  .on(Create, logInboxActivity(handleCreate))
  .on(Delete, logInboxActivity(handleDelete))
  .on(Update, logInboxActivity(handleUpdate))
  .on(Like, logInboxActivity(handleReaction))
  .on(EmojiReact, logInboxActivity(handleReaction))
  .on(QuoteRequest, logInboxActivity(handleQuoteRequest));

federation
  .setFollowersDispatcher("/users/{identifier}/followers", dispatchFollowers)
  .setCounter(countFollowers);

federation.setObjectDispatcher(Note, "/post/{slug}", dispatchNote);
federation.setObjectDispatcher(
  QuoteAuthorization,
  "/quote-authorizations/{stamp}",
  dispatchQuoteAuthorization,
);

export { federation };
