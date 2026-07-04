import { Create, Document, Note } from "@fedify/vocab";
import { Temporal } from "@js-temporal/polyfill";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

import { federation } from "~/federation";
import { prisma } from "~/lib/prisma";

export async function createDirectMessageReply(
  parentId: string,
  recipientActorId: string,
  content: string,
  images?: Array<{ url: string; mediaType: string }>,
) {
  const parentMessage = await prisma.directMessage.findUniqueOrThrow({
    where: { id: parentId },
  });
  const recipientActor = await prisma.actor.findUniqueOrThrow({ where: { id: recipientActorId } });

  const mainActor = await prisma.mainActor.findFirst({ include: { actor: true } });
  if (!mainActor) {
    throw new Error("Main actor is not defined");
  }

  const htmlContent = await marked(content);
  const sanitizedContent = DOMPurify.sanitize(htmlContent);
  const noteUri = `${process.env.PUBLIC_URL}/direct-messages/${crypto.randomUUID()}`;

  const message = await prisma.directMessage.create({
    data: {
      uri: noteUri,
      actorId: mainActor.actor.id,
      content: sanitizedContent,
      to: [recipientActor.uri],
      cc: [],
      replyTargetUri: parentMessage.uri,
      direction: "outgoing",
      attachment:
        images && images.length > 0
          ? {
              createMany: {
                data: images.map((image) => ({
                  url: image.url,
                  mediaType: image.mediaType,
                  sensitive: false,
                })),
              },
            }
          : undefined,
    },
  });

  const ctx = federation.createContext(new Request(process.env.PUBLIC_URL!), undefined);
  const note = new Note({
    id: new URL(message.uri),
    attribution: new URL(mainActor.actor.uri),
    tos: [new URL(recipientActor.uri)],
    content: sanitizedContent,
    replyTarget: new URL(parentMessage.uri),
    attachments: images?.map(
      (image) => new Document({ url: new URL(image.url), mediaType: image.mediaType }),
    ),
    published: Temporal.Instant.from(message.createdAt.toISOString()),
  });

  await ctx.sendActivity(
    { identifier: mainActor.actor.username },
    {
      id: new URL(recipientActor.uri),
      inboxId: new URL(recipientActor.inboxUrl),
      endpoints: recipientActor.sharedInboxUrl
        ? { sharedInbox: new URL(recipientActor.sharedInboxUrl) }
        : null,
    },
    new Create({
      id: new URL("#activity", note.id ?? undefined),
      actors: note.attributionIds,
      tos: note.toIds,
      object: note,
    }),
  );

  return message;
}
