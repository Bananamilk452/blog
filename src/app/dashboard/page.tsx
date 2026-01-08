import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ManageMainActor } from "~/components/dashboard/ManageMainActor";
import { ManageUser } from "~/components/dashboard/ManageUser";
import { PostList } from "~/components/dashboard/post/PostList";
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
        <PostList />

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
