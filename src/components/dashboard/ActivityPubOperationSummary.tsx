import { format } from "date-fns";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getInboxOperationSummary } from "~/lib/actions/inboxActivityLog";

export async function ActivityPubOperationSummary() {
  const summary = await getInboxOperationSummary();

  return (
    <Card>
      <CardHeader>
        <CardTitle>ActivityPub 운영 상태</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="24시간 수신" value={summary.inboxReceived24h} />
          <SummaryMetric label="처리 실패" value={summary.failedInboxCount} tone="danger" />
          <SummaryMetric label="미처리" value={summary.pendingInboxCount} tone="warning" />
          <SummaryMetric label="팔로워" value={summary.followerCount} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SummaryList title="최근 팔로우/언팔로우">
            {summary.recentFollowActivities.length > 0 ? (
              summary.recentFollowActivities.map((activity) => (
                <li key={activity.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{activity.activityType}</Badge>
                    <span className="text-xs text-(--ink-soft)">{activity.status}</span>
                  </div>
                  <span className="truncate text-sm">{activity.actorUri ?? "Actor 없음"}</span>
                  <time
                    className="text-xs text-(--ink-soft)"
                    dateTime={activity.receivedAt.toISOString()}
                  >
                    {format(activity.receivedAt, "yyyy.MM.dd HH:mm")}
                  </time>
                </li>
              ))
            ) : (
              <EmptyListItem>최근 팔로우/언팔로우가 없습니다.</EmptyListItem>
            )}
          </SummaryList>

          <SummaryList title="최근 처리 에러">
            {summary.recentErrors.length > 0 ? (
              summary.recentErrors.map((error) => (
                <li key={error.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{error.activityType}</Badge>
                    <time
                      className="text-xs text-(--ink-soft)"
                      dateTime={error.receivedAt.toISOString()}
                    >
                      {format(error.receivedAt, "yyyy.MM.dd HH:mm")}
                    </time>
                  </div>
                  <span className="line-clamp-2 text-sm">
                    {error.errorMessage ?? "에러 메세지 없음"}
                  </span>
                  <span className="truncate text-xs text-(--ink-soft)">
                    {error.actorUri ?? error.objectId ?? "대상 정보 없음"}
                  </span>
                </li>
              ))
            ) : (
              <EmptyListItem>최근 처리 에러가 없습니다.</EmptyListItem>
            )}
          </SummaryList>

          <SummaryList title="최근 원격 Actor 갱신">
            {summary.recentActorUpdates.length > 0 ? (
              summary.recentActorUpdates.map((actor) => (
                <li key={actor.id} className="flex flex-col gap-1">
                  <span className="font-medium">{actor.name ?? actor.handle}</span>
                  <span className="truncate text-sm text-(--ink-soft)">{actor.handle}</span>
                  <time
                    className="text-xs text-(--ink-soft)"
                    dateTime={actor.updatedAt.toISOString()}
                  >
                    {format(actor.updatedAt, "yyyy.MM.dd HH:mm")}
                  </time>
                </li>
              ))
            ) : (
              <EmptyListItem>최근 갱신된 원격 Actor가 없습니다.</EmptyListItem>
            )}
          </SummaryList>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/dashboard/notifications">
            <Button variant="outline">알림 보기</Button>
          </Link>
          <Link href="/dashboard/activitypub-inbox">
            <Button variant="outline">수신 로그 보기</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-(--line) bg-(--paper-note) p-4">
      <div className="text-sm text-(--ink-soft)">{label}</div>
      <div className={tone === "danger" ? "text-3xl font-bold text-red-700" : "text-3xl font-bold"}>
        {value.toLocaleString("ko-KR")}
      </div>
      {tone === "warning" && <div className="text-xs text-amber-700">처리 지연 여부 확인 필요</div>}
    </div>
  );
}

function SummaryList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-(--line) p-4">
      <h2 className="font-bold">{title}</h2>
      <ul className="flex flex-col gap-3">{children}</ul>
    </section>
  );
}

function EmptyListItem({ children }: { children: React.ReactNode }) {
  return <li className="text-sm text-(--ink-soft)">{children}</li>;
}
