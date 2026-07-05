"use server";

import { prisma } from "~/lib/prisma";
import { getVapidPublicKey } from "~/lib/push-notifications";
import { getValidAdminSession } from "~/lib/utils-server";

import type { BrowserPushSubscription } from "~/lib/push-notifications";

export async function getPushNotificationSettings() {
  const session = await getValidAdminSession();
  const publicKey = getVapidPublicKey();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id, enabled: true },
    select: { endpoint: true },
  });

  return {
    publicKey,
    enabled: subscriptions.length > 0,
  };
}

export async function subscribePushNotification(subscription: BrowserPushSubscription) {
  const session = await getValidAdminSession();

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      enabled: true,
      expiresAt: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
    },
    update: {
      userId: session.user.id,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      enabled: true,
      expiresAt: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
    },
  });
}

export async function unsubscribePushNotification(endpoint?: string) {
  const session = await getValidAdminSession();

  await prisma.pushSubscription.deleteMany({
    where: { userId: session.user.id, ...(endpoint ? { endpoint } : {}) },
  });
}
