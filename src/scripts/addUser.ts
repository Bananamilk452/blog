import "dotenv/config";

import { Command } from "commander";

import { auth } from "~/lib/auth";
import { prisma } from "~/lib/prisma";

const program = new Command();

program
  .requiredOption("-e, --email <email>", "email address")
  .requiredOption("-n, --name <name>", "name")
  .requiredOption("-u, --username <username>", "username")
  .requiredOption("-p, --password <password>", "password");

program.parse();
const options = program.opts();

async function createUser() {
  await auth.api.signUpEmail({
    body: {
      email: options.email,
      name: options.name,
      username: options.username,
      password: options.password,
    },
  });

  const user = await prisma.user.findFirst({ where: { email: options.email } });

  if (!user) {
    throw new Error("Cannot find user");
  }

  if (!process.env.PUBLIC_URL) {
    throw new Error("PUBLIC_URL is not defined");
  }

  const url = new URL(process.env.PUBLIC_URL);

  await prisma.actor.create({
    data: {
      userId: user.id,
      uri: `${url.host}/users/${user.username}`,
      handle: user.username,
      name: user.name,
      inboxUrl: `${url.host}/users/${user.username}/inbox`,
      sharedInboxUrl: `${url.host}/inbox`,
      url: `${url.origin}/users/${user.username}`,
    },
  });

  console.log(`✅ User created: ${options.email}`);
}

createUser();
