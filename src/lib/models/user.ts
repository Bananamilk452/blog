import { prisma } from "../prisma";

export function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      avatar: true,
    },
  });
}
