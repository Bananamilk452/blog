import { ActivityPubInboxLogList } from "~/components/dashboard/ActivityPubInboxLogList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DefaultLayout } from "~/layouts/default";

export default function ActivityPubInboxPage() {
  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">ActivityPub 수신 로그</h1>
          <p className="text-sm text-(--ink-soft)">
            Inbox로 들어온 activity의 처리 상태와 원본 JSON-LD를 확인합니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inbox 로그</CardTitle>
            <CardDescription>실패하거나 무시된 activity를 추적할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityPubInboxLogList />
          </CardContent>
        </Card>
      </div>
    </DefaultLayout>
  );
}
