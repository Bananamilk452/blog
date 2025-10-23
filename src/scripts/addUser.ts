import "dotenv/config";

import { Command } from "commander";

import { auth } from "~/lib/auth";
import { prisma } from "~/lib/prisma";

const program = new Command();

program
  .requiredOption("-e, --email <email>", "email address")
  .requiredOption("-n, --name <name>", "name")
  .requiredOption("-u, --username <username>", "username")
  .requiredOption("-p, --password <password>", "password")
  .option("-a, --admin", "set user as admin");

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

  if (options.admin) {
    await prisma.user.update({
      where: { email: options.email },
      data: { role: "admin" },
    });
  }

  console.log(`✅ User created: ${options.email} (${options.username})`);
}

createUser();
