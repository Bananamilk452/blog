import { Image } from "~/generated/prisma";

import { prisma } from "../prisma";
import { uploadFile } from "./s3";

export function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      avatar: true,
    },
  });
}

export function updateUser(
  userId: string,
  data: { name: string; avatar: File | undefined },
) {
  return prisma.$transaction(async (tx) => {
    let avatarObject: Image | null = null;

    if (data.avatar) {
      const avatarUrl = await uploadFile(data.avatar, "local-contents");
      avatarObject = await tx.image.create({
        data: {
          url: avatarUrl,
          originalUrl: avatarUrl,
        },
      });
    }

    return await tx.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        avatar: avatarObject
          ? {
              connect: { id: avatarObject.id },
            }
          : undefined,
      },
      include: {
        avatar: true,
      },
    });
  });
}
