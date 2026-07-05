import { InboxNotificationList } from "~/components/dashboard/InboxNotificationList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DefaultLayout } from "~/layouts/default";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ActivityPub 알림",
};

export default function NotificationsPage() {
  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">ActivityPub 알림</h1>
          <p className="text-sm text-(--ink-soft)">
            Inbox history에서 댓글, 마음, 이모지 리액션, 리노트를 모아 보여줍니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>알림</CardTitle>
            <CardDescription>
              처리 완료된 activity 중 블로그 콘텐츠와 연결된 항목만 표시합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InboxNotificationList />
          </CardContent>
        </Card>
      </div>
    </DefaultLayout>
  );
}
