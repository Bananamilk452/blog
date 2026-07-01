"use server";

import { prisma } from "~/lib/prisma";
import { getValidAdminSession } from "~/lib/utils-server";

export async function getInboxActivityLogs(options?: {
  page?: number;
  limit?: number;
  status?: string;
  activityType?: string;
}) {
  await getValidAdminSession();

  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const where = {
    ...(options?.status ? { status: options.status } : {}),
    ...(options?.activityType ? { activityType: options.activityType } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.inboxActivityLog.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inboxActivityLog.count({ where }),
  ]);

  return { records, total };
}

export async function getInboxActivityLogTypes() {
  await getValidAdminSession();

  const records = await prisma.inboxActivityLog.findMany({
    distinct: ["activityType"],
    orderBy: { activityType: "asc" },
    select: { activityType: true },
  });

  return records.map((record) => record.activityType);
}
