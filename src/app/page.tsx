import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { PostList } from "~/components/home/PostList";
import { PAGE_SIZE } from "~/constants";
import { DefaultLayout } from "~/layouts/default";
import { getPosts } from "~/lib/actions/post";
import { getQueryClient } from "~/lib/getQueryClient";

export default function Home() {
  const queryClient = getQueryClient();

  queryClient.prefetchInfiniteQuery({
    queryKey: ["posts", { limit: PAGE_SIZE }],
    queryFn: ({ pageParam }) => getPosts({ limit: PAGE_SIZE, page: pageParam }),
    initialPageParam: 1,
  });

  return (
    <DefaultLayout>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PostList />
      </HydrationBoundary>
    </DefaultLayout>
  );
}
