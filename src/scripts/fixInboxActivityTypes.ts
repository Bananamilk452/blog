import "dotenv/config";
import { Command } from "commander";

import { prisma } from "~/lib/prisma";

const program = new Command();

program
  .option("--dry-run", "print changes without updating records")
  .option("--batch-size <size>", "number of records to read at once", "100")
  .option("--limit <count>", "maximum number of records to scan");

program.parse();

const options = program.opts<{
  dryRun?: boolean;
  batchSize: string;
  limit?: string;
}>();

const batchSize = parsePositiveInteger(options.batchSize, "batch-size");
const scanLimit = options.limit ? parsePositiveInteger(options.limit, "limit") : null;

async function fixInboxActivityTypes() {
  let lastId: string | undefined;
  let scanned = 0;
  let changed = 0;
  let skipped = 0;

  while (scanLimit == null || scanned < scanLimit) {
    const take = scanLimit == null ? batchSize : Math.min(batchSize, scanLimit - scanned);
    const records = await prisma.inboxActivityLog.findMany({
      orderBy: { id: "asc" },
      ...(lastId ? { cursor: { id: lastId }, skip: 1 } : {}),
      take,
      select: {
        id: true,
        activityType: true,
        rawJson: true,
      },
    });

    if (records.length === 0) break;

    const updates = records.flatMap((record) => {
      const activityType = getRawActivityType(record.rawJson);

      if (!activityType) {
        skipped += 1;
        return [];
      }

      if (record.activityType === activityType) return [];

      changed += 1;
      console.log(`${record.id}: ${record.activityType} -> ${activityType}`);

      if (options.dryRun) return [];

      return prisma.inboxActivityLog.update({
        where: { id: record.id },
        data: { activityType },
      });
    });

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    scanned += records.length;
    lastId = records.at(-1)?.id;
  }

  console.log(
    `${options.dryRun ? "Dry run complete" : "Done"}: scanned=${scanned}, changed=${changed}, skipped=${skipped}`,
  );
}

function getRawActivityType(rawJson: unknown) {
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) return null;

  const type = (rawJson as { type?: unknown }).type;
  return typeof type === "string" && type.length > 0 ? type : null;
}

function parsePositiveInteger(value: string, name: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

fixInboxActivityTypes()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
