import { DirectMessageList } from "~/components/dashboard/DirectMessageList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DefaultLayout } from "~/layouts/default";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "다이렉트 메세지",
};

export default function DirectMessagesPage() {
  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">다이렉트 메세지</h1>
          <p className="text-sm text-(--ink-soft)">
            ActivityPub로 받은 일반 다이렉트 메세지를 확인하고 답장합니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>메세지</CardTitle>
            <CardDescription>포스트에 달리지 않은 비공개 Note만 표시합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <DirectMessageList />
          </CardContent>
        </Card>
      </div>
    </DefaultLayout>
  );
}
