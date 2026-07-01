import { exportJwk, generateCryptoKeyPair, importJwk } from "@fedify/fedify";

import { log } from "./log";
import { Keys as Key } from "~/generated/prisma";
import { prisma } from "~/lib/prisma";

import type { Context } from "@fedify/fedify";

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
