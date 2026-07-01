import { prisma } from "~/lib/prisma";

import type { Activity, InboxContext } from "@fedify/fedify";
import type { Prisma } from "~/generated/prisma";

export type InboxActivityStatus = "handled" | "ignored";
export type InboxActivityHandler<TActivity extends Activity> = (
  ctx: InboxContext<unknown>,
  activity: TActivity,
) => Promise<InboxActivityStatus>;

export function logInboxActivity<TActivity extends Activity>(
  handler: InboxActivityHandler<TActivity>,
) {
  return async (ctx: InboxContext<unknown>, activity: TActivity) => {
    const rawJson = await activity.toJsonLd({ format: "compact" });
    const logRecord = await prisma.inboxActivityLog.create({
      data: {
        activityId: activity.id?.href,
        activityType: activity.constructor.name,
        actorUri: activity.actorId?.href,
        objectId: activity.objectId?.href,
        rawJson: toPrismaJson(rawJson),
        status: "received",
      },
    });

    try {
      const status = await handler(ctx, activity);
      await prisma.inboxActivityLog.update({
        where: { id: logRecord.id },
        data: { status, handledAt: new Date() },
      });
    } catch (error) {
      await prisma.inboxActivityLog.update({
        where: { id: logRecord.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
          handledAt: new Date(),
        },
      });
      throw error;
    }
  };
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
