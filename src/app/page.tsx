import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { PostList } from "~/components/home/PostList";
import { PAGE_SIZE } from "~/constants";
import { DefaultLayout } from "~/layouts/default";
import { getPosts } from "~/lib/actions/post";
import { getQueryClient } from "~/lib/getQueryClient";
import { getAbsoluteUrl, SITE_DESCRIPTION, SITE_NAME, stringifyJsonLd } from "~/lib/seo";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: SITE_NAME,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  const queryClient = getQueryClient();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: getAbsoluteUrl("/"),
  };

  queryClient.prefetchInfiniteQuery({
    queryKey: ["posts", { limit: PAGE_SIZE }],
    queryFn: ({ pageParam }) => getPosts({ limit: PAGE_SIZE, page: pageParam }),
    initialPageParam: 1,
  });

  return (
    <DefaultLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(jsonLd) }}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PostList />
      </HydrationBoundary>
    </DefaultLayout>
  );
}
