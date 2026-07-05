import { ActorKeyPair } from "@fedify/fedify";
import { Endpoints, Image, Person } from "@fedify/vocab";

import { prisma } from "~/lib/prisma";
import { federationLog as log } from "~/lib/server-log";

import type { RequestContext } from "@fedify/fedify";

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
