import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ManageMainActor } from "~/components/dashboard/ManageMainActor";
import { PostList } from "~/components/dashboard/PostList";
import { DefaultLayout } from "~/layouts/default";
import { getMainActor } from "~/lib/actions/actor";
import { getQueryClient } from "~/lib/getQueryClient";

export default function DashboardPage() {
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: ["main-actor"],
    queryFn: () => getMainActor(),
  });

  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">대시보드</h1>

        <HydrationBoundary state={dehydrate(queryClient)}>
          <ManageMainActor />
        </HydrationBoundary>

        <PostList />
      </div>
    </DefaultLayout>
  );
}
