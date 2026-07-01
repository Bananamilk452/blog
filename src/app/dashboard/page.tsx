import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { BugIcon } from "lucide-react";
import Link from "next/link";

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
              <Link href="/dashboard/activitypub-inbox">
                <Button variant="outline">
                  <BugIcon /> ActivityPub 수신 로그
                </Button>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="text-sm text-(--ink-soft)">
            Inbox로 들어온 activity의 처리 상태와 원본 JSON-LD를 확인합니다.
          </CardContent>
        </Card>
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
