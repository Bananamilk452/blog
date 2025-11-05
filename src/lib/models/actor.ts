import { Update } from "@fedify/fedify";

import { federation } from "~/federation";
import { Image } from "~/generated/prisma";

import { prisma } from "../prisma";
import { uploadFile } from "./s3";

export async function getMainActor() {
  const mainActor = await prisma.mainActor.findFirst({
    include: {
      actor: {
        include: {
          avatar: true,
          banner: true,
        },
      },
    },
  });

  if (!mainActor) {
    throw new Error("Main actor not found");
  }

  return mainActor;
}

export async function updateMainActor({
  name,
  summary,
  avatar,
  banner,
}: {
  name: string;
  summary?: string;
  avatar?: File;
  banner?: File;
}) {
  return await prisma.$transaction(async (tx) => {
    let avatarObject: Image | null = null;
    let bannerObject: Image | null = null;

    if (avatar) {
      const avatarUrl = await uploadFile(avatar, "local-contents");
      avatarObject = await tx.image.create({
        data: {
          url: avatarUrl,
          originalUrl: avatarUrl,
        },
      });
    }

    if (banner) {
      const bannerUrl = await uploadFile(banner, "local-contents");
      bannerObject = await tx.image.create({
        data: {
          url: bannerUrl,
          originalUrl: bannerUrl,
        },
      });
    }

    const mainActor = await getMainActor();

    const a = await tx.actor.update({
      where: { id: mainActor.actor.id },
      data: {
        name,
        summary,
        avatarId: avatarObject ? avatarObject.id : mainActor.actor.avatarId,
        bannerId: bannerObject ? bannerObject.id : mainActor.actor.bannerId,
      },
    });

    const context = federation.createContext(
      new Request(process.env.PUBLIC_URL!),
      undefined,
    );
    const actor = await context.getActor(a.handle);

    if (actor) {
      await context.sendActivity(
        { identifier: a.handle },
        "followers",
        new Update({
          actor: actor.id,
          object: actor,
        }),
      );
    }
  });
}
