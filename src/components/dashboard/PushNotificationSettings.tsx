"use client";

import { BellIcon, BellOffIcon } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  subscribePushNotification,
  unsubscribePushNotification,
} from "~/lib/actions/pushNotification";
import { cn } from "~/lib/utils";

type PushNotificationSettingsProps = {
  publicKey: string | null;
  enabled: boolean;
};

export function PushNotificationSettings({ publicKey, enabled }: PushNotificationSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isPending, setIsPending] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  async function enablePushNotification() {
    if (!publicKey) {
      toast.error("VAPID 공개키가 설정되어 있지 않습니다.");
      return;
    }

    if (!supported) {
      toast.error("이 브라우저는 웹 푸시를 지원하지 않습니다.");
      return;
    }

    setIsPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("알림 권한이 허용되지 않았습니다.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await subscribePushNotification(toBrowserPushSubscription(subscription));
      setIsEnabled(true);
      toast.success("웹 푸시 알림을 켰습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "웹 푸시 구독에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  async function disablePushNotification() {
    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
      await unsubscribePushNotification(subscription?.endpoint);
      setIsEnabled(false);
      toast.success("웹 푸시 알림을 껐습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "웹 푸시 구독 해제에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  function handleClick() {
    startTransition(() => {
      void (isEnabled ? disablePushNotification() : enablePushNotification());
    });
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="font-medium">웹 푸시 알림</p>
        <p className="text-sm text-(--ink-soft)">
          댓글, 마음, 이모지 리액션, 리노트가 들어오면 이 브라우저로 알림을 받습니다.
        </p>
        {!publicKey ? (
          <p className="text-sm text-destructive">VAPID 공개키 설정이 필요합니다.</p>
        ) : null}
      </div>

      <Button
        type="button"
        variant={isEnabled ? "secondary" : "default"}
        className={cn("w-full sm:w-auto", isEnabled && "border-(--line)")}
        onClick={handleClick}
        disabled={isPending || !supported || !publicKey}
      >
        {isEnabled ? <BellOffIcon /> : <BellIcon />}
        {isEnabled ? "알림 끄기" : "알림 켜기"}
      </Button>
    </div>
  );
}

function toBrowserPushSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("브라우저 푸시 구독 정보가 올바르지 않습니다.");
  }

  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
