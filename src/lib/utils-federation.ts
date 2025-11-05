import { Activity, getActorHandle } from "@fedify/fedify";
import debug from "debug";
import ky from "ky";

import { uploadFile } from "./models/s3";
import { prisma } from "./prisma";

const log = debug("blog:federation");

export async function upsertActor(
  actor: Awaited<ReturnType<Activity["getActor"]>>,
) {
  return await prisma
    .$transaction(async (tx) => {
      if (!actor || !actor.id || !actor.inboxId) {
        log("Invalid actor data:", actor);
        throw new Error("Invalid actor data");
      }

      const a = await tx.actor.findUnique({
        where: { uri: actor.id.href },
        include: { avatar: true },
      });

      const icon = await actor.getIcon();

      let uploadedUrl: string | null = null;

      // 아바타 업데이트가 필요하면
      if (a?.avatar?.originalUrl !== icon?.url?.toString()) {
        if (icon && icon.url) {
          const iconArrayBuffer = await ky
            .get(icon.url.toString())
            .arrayBuffer();
          const iconFile = new File(
            [iconArrayBuffer],
            icon.url.toString().split("/").pop() || "avatar",
            {
              type: icon.mediaType?.toString() || "image/jpeg",
            },
          );
          uploadedUrl = await uploadFile(iconFile, "remote-contents");
        }
      }

      return await tx.actor.upsert({
        where: { uri: actor.id.href },
        create: {
          uri: actor.id.href,
          handle: await getActorHandle(actor),
          name: actor.name?.toString(),
          inboxUrl: actor.inboxId.href,
          sharedInboxUrl: actor.endpoints?.sharedInbox?.href,
          url: actor.url?.href?.toString(),
          avatar: {
            create: {
              url: uploadedUrl || icon?.url?.toString() || "",
              originalUrl: icon?.url?.toString() || "",
            },
          },
        },
        update: {
          handle: await getActorHandle(actor),
          name: actor.name?.toString(),
          inboxUrl: actor.inboxId.href,
          sharedInboxUrl: actor.endpoints?.sharedInbox?.href,
          url: actor.url?.href?.toString(),
          avatar: {
            upsert: {
              create: {
                url: uploadedUrl || icon?.url?.toString() || "",
                originalUrl: icon?.url?.toString() || "",
              },
              update: {
                url: uploadedUrl || icon?.url?.toString() || "",
                originalUrl: icon?.url?.toString() || "",
              },
            },
          },
        },
      });
    })
    .catch((err) => {
      log("Error upserting actor:", err);
      throw err;
    });
}
