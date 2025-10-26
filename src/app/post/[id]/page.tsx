import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getPost } from "~/lib/actions/post";
import { getQueryClient } from "~/lib/getQueryClient";

import { PostPage } from "./PostPage";

export default async function PostIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: ["post", id] as const,
    queryFn: () => getPost(id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostPage id={id} />
    </HydrationBoundary>
  );
}
