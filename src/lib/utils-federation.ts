import { Activity, Document, getActorHandle, Note, PUBLIC_COLLECTION } from "@fedify/vocab";
import debug from "debug";

import { uploadFile } from "./models/s3";
import { prisma } from "./prisma";
import { downloadFile } from "./utils-server";

const log = debug("blog:federation");

export async function upsertActor(actor: Awaited<ReturnType<Activity["getActor"]>>) {
  if (!actor || !actor.id || !actor.inboxId) {
    log("Invalid actor data:", actor);
    throw new Error("Invalid actor data");
  }

  const actorUri = actor.id.href;
  const inboxUrl = actor.inboxId.href;

  const a = await prisma.actor.findUnique({
    where: { uri: actorUri },
    include: { avatar: true },
  });

  const icon = await actor.getIcon();
  const iconUrl = icon?.url?.toString();

  let uploadedUrl: string | null = null;

  // 아바타 업데이트가 필요하면 먼저 다운로드/업로드를 끝낸 뒤 DB 트랜잭션을 연다.
  if (a?.avatar?.originalUrl !== iconUrl) {
    if (icon && icon.url) {
      const iconArrayBuffer = await downloadFile(icon.url.toString());
      const iconFile = new File(
        [iconArrayBuffer],
        icon.url.toString().split("/").pop() || "avatar",
        {
          type: icon.mediaType?.toString() || "",
        },
      );
      uploadedUrl = await uploadFile(iconFile, "remote-contents");
    }
  }

  const handle = await getActorHandle(actor);
  const username = actor.preferredUsername?.toString() || handle.split("@")[1] || "";

  return await prisma
    .$transaction(async (tx) => {
      return await tx.actor.upsert({
        where: { uri: actorUri },
        create: {
          uri: actorUri,
          name: actor.name?.toString(),
          handle,
          username,
          inboxUrl,
          sharedInboxUrl: actor.endpoints?.sharedInbox?.href,
          url: actor.url?.href?.toString(),
          avatar: {
            create: {
              url: uploadedUrl || iconUrl || "",
              originalUrl: iconUrl || "",
            },
          },
        },
        update: {
          name: actor.name?.toString(),
          handle,
          username,
          inboxUrl,
          sharedInboxUrl: actor.endpoints?.sharedInbox?.href,
          url: actor.url?.href?.toString(),
          avatar: {
            upsert: {
              create: {
                url: uploadedUrl || iconUrl || "",
                originalUrl: iconUrl || "",
              },
              update: {
                url: uploadedUrl || iconUrl || "",
                originalUrl: iconUrl || "",
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

export function isPublic(toIds: URL[] | string[]) {
  const toIdsUrls = toIds.map((url) => (typeof url === "string" ? new URL(url) : url));

  if (toIdsUrls.find((url) => url.href === PUBLIC_COLLECTION.href)) {
    return true;
  }
}

export function isNonList(toIds: URL[] | string[], ccIds: URL[] | string[]) {
  const toIdsUrls = toIds.map((url) => (typeof url === "string" ? new URL(url) : url));
  const ccIdsUrls = ccIds.map((url) => (typeof url === "string" ? new URL(url) : url));

  if (
    toIdsUrls.find((url) => url.href !== PUBLIC_COLLECTION.href) &&
    ccIdsUrls.find((url) => url.href == PUBLIC_COLLECTION.href)
  ) {
    return true;
  }
  return false;
}

export function isFollowersOnly(toIds: URL[] | string[], ccIds: URL[] | string[]) {
  const toIdsUrls = toIds.map((url) => (typeof url === "string" ? new URL(url) : url));
  const ccIdsUrls = ccIds.map((url) => (typeof url === "string" ? new URL(url) : url));

  if (
    !toIdsUrls.find((url) => url.href === PUBLIC_COLLECTION.href) &&
    !ccIdsUrls.find((url) => url.href === PUBLIC_COLLECTION.href)
  ) {
    return true;
  }
  return false;
}

export function getTagFromNote(note: Note) {
  const json = note.toJsonLd() as
    | {
        tag?:
          | { type: string; href?: string; name?: string }
          | { type: string; href?: string; name?: string }[];
      }
    | { type: string; href?: string; name?: string };

  const tags = "tag" in json ? json.tag : undefined;
  const tagArray = Array.isArray(tags) ? tags : tags == null ? [] : [tags];

  return tagArray.filter(
    (tag): tag is { type: string; href: string; name: string } =>
      tag.type === "Mention" && typeof tag.href === "string" && typeof tag.name === "string",
  );
}

export async function formatNoteAttachments(note: Note) {
  const formattedAttachments = [];

  for await (const attachment of note.getAttachments()) {
    if (attachment instanceof Document) {
      formattedAttachments.push({
        url: attachment.url?.toString() || "",
        mediaType: attachment.mediaType,
        sensitive: attachment.sensitive || false,
        name: attachment.name?.toString(),
      });
    }
  }

  return formattedAttachments;
}

export function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error != null && "code" in error && error.code === "P2002";
}
