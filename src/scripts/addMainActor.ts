import "dotenv/config";

import { Command } from "commander";

import { auth } from "~/lib/auth";
import { prisma } from "~/lib/prisma";

const program = new Command();

program
  .requiredOption("-n, --name <name>", "actor name")
  .requiredOption("-u, --username <username>", "actor username");

program.parse();
const options = program.opts();

async function createMainActor() {
  const email = `${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID();

  await auth.api.signUpEmail({
    body: {
      email,
      name: options.name,
      username: options.username,
      password,
    },
  });

  const user = await prisma.user.findFirst({ where: { email } });

  if (!user) {
    throw new Error("Cannot find user");
  }

  if (!process.env.PUBLIC_URL) {
    throw new Error("PUBLIC_URL is not defined");
  }

  const url = new URL(process.env.PUBLIC_URL);

  await prisma.mainActor.upsert({
    // MainActor는 하나만 존재해야 하므로 id가 1인 것을 기준으로 업서트합니다.
    where: { id: 1 },
    create: {
      actor: {
        create: {
          userId: user.id,
          uri: `${url.origin}/users/${user.username}`,
          name: user.name,
          handle: `@${user.username}@${url.hostname}`,
          username: user.username,
          inboxUrl: `${url.origin}/users/${user.username}/inbox`,
          sharedInboxUrl: `${url.origin}/inbox`,
          url: `${url.origin}/users/${user.username}`,
        },
      },
    },
    update: {
      actor: {
        create: {
          userId: user.id,
          uri: `${url.origin}/users/${user.username}`,
          name: user.name,
          handle: `@${user.username}@${url.hostname}`,
          username: user.username,
          inboxUrl: `${url.origin}/users/${user.username}/inbox`,
          sharedInboxUrl: `${url.origin}/inbox`,
          url: `${url.origin}/users/${user.username}`,
        },
      },
    },
  });

  console.log(`✅ Main Actor and temporary user created: ${options.username}`);
}

createMainActor();
