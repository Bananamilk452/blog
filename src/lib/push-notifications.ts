import "server-only";
import webPush from "web-push";

import { prisma } from "~/lib/prisma";
import { pushNotificationLog as log } from "~/lib/server-log";

import type { PushSubscription } from "~/generated/prisma";

export type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string | null;
  tag?: string;
};

export type BrowserPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

let vapidConfigured = false;

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null;
}

export async function sendPushNotificationToAdmins(payload: PushNotificationPayload) {
  if (!configureVapid()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      enabled: true,
      user: { role: "admin" },
    },
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          toWebPushSubscription(subscription),
          JSON.stringify(payload),
          {
            TTL: 60 * 60,
            urgency: "normal",
            topic: payload.tag?.slice(0, 32),
          },
        );
      } catch (error) {
        await handlePushError(subscription.id, error);
      }
    }),
  );
}

function configureVapid() {
  if (vapidConfigured) return true;

  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? process.env.PUBLIC_URL;

  if (!publicKey || !privateKey || !subject) {
    log("Web push is not configured. Set VAPID public key, private key, and subject.");
    return false;
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function toWebPushSubscription(subscription: PushSubscription) {
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expiresAt?.getTime() ?? null,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

async function handlePushError(subscriptionId: string, error: unknown) {
  const statusCode =
    typeof error === "object" && error != null && "statusCode" in error
      ? Number(error.statusCode)
      : null;

  if (statusCode === 404 || statusCode === 410) {
    await prisma.pushSubscription.deleteMany({ where: { id: subscriptionId } });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  log("Failed to send web push notification: %s", message);
}
