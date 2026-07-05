import { Suspense } from "@suspensive/react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import PostLoading from "./loading";
import { PostPage } from "./PostPage";
import { getCommentsBySlug, getPostBySlug } from "~/lib/actions/post";
import { getQueryClient } from "~/lib/getQueryClient";

export default async function PostIdPage({ params }: { params: Promise<{ slug: string }> }) {
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
      <Suspense fallback={<PostLoading />}>
        <PostPage slug={slug} />
      </Suspense>
    </HydrationBoundary>
  );
}
