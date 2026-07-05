import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { BellIcon, BugIcon, MailIcon } from "lucide-react";
import Link from "next/link";

import { ActivityPubOperationSummary } from "~/components/dashboard/ActivityPubOperationSummary";
import { ManageMainActor } from "~/components/dashboard/ManageMainActor";
import { ManageUser } from "~/components/dashboard/ManageUser";
import { PostList } from "~/components/dashboard/post/PostList";
import { RecentCommentList } from "~/components/dashboard/RecentCommentList";
import { Button } from "~/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DefaultLayout } from "~/layouts/default";
import { getMainActor } from "~/lib/actions/actor";
import { getUser } from "~/lib/actions/user";
import { getQueryClient } from "~/lib/getQueryClient";

export default function DashboardPage() {
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: ["main-actor"],
    queryFn: () => getMainActor(),
  });

  queryClient.prefetchQuery({
    queryKey: ["user"],
    queryFn: () => getUser(),
  });

  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <Card>
          <CardHeader>
            <CardTitle>운영 도구</CardTitle>
            <CardAction>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/dashboard/direct-messages">
                  <Button variant="outline">
                    <MailIcon /> 다이렉트 메세지
                  </Button>
                </Link>
                <Link href="/dashboard/notifications">
                  <Button variant="outline">
                    <BellIcon /> ActivityPub 알림
                  </Button>
                </Link>
                <Link href="/dashboard/activitypub-inbox">
                  <Button variant="outline">
                    <BugIcon /> ActivityPub 수신 로그
                  </Button>
                </Link>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="text-sm text-(--ink-soft)">
            ActivityPub 다이렉트 메세지를 확인하고, Inbox activity 처리 상태를 추적합니다.
          </CardContent>
        </Card>
        <ActivityPubOperationSummary />
        <PostList />
        <RecentCommentList />

        <HydrationBoundary state={dehydrate(queryClient)}>
          <ManageMainActor />
        </HydrationBoundary>

        <HydrationBoundary state={dehydrate(queryClient)}>
          <ManageUser />
        </HydrationBoundary>
      </div>
    </DefaultLayout>
  );
}
