import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getCommentsBySlug, getPostBySlug } from "~/lib/actions/post";
import { getQueryClient } from "~/lib/getQueryClient";

import { PostPage } from "./PostPage";

export default async function PostIdPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: ["post", slug] as const,
    queryFn: () => getPostBySlug(slug),
  });

  queryClient.prefetchQuery({
    queryKey: ["post-comments", slug] as const,
    queryFn: () => getCommentsBySlug(slug),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostPage slug={slug} />
    </HydrationBoundary>
  );
}
