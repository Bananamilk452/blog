"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Image from "next/image";
import { Fragment } from "react";

import { PAGE_SIZE } from "~/constants";
import { getPosts } from "~/lib/actions/post";

export function PostList() {
  const { data, status, fetchNextPage } = useSuspenseInfiniteQuery({
    queryKey: ["posts", { limit: PAGE_SIZE }],
    queryFn: ({ pageParam }) => getPosts({ limit: PAGE_SIZE, page: pageParam }),
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.records.length < PAGE_SIZE) {
        return undefined;
      }
      return lastPageParam + 1;
    },
    initialPageParam: 1,
  });

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {data?.pages.map((page, pageIndex) => (
        <Fragment key={pageIndex}>
          {page.records.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

export function PostCard({
  post,
}: {
  post: Awaited<ReturnType<typeof getPosts>>["records"][number];
}) {
  return (
    <div className="flex w-full max-w-96 flex-col overflow-hidden rounded-md shadow-md">
      <div className="relative h-48 bg-gray-300">
        {post.banner && (
          <Image
            src={post.banner.url}
            alt={post.title}
            fill={true}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-col bg-gray-400 p-4 text-black">
        <h2 className="text-xl font-bold">{post.title}</h2>
        {post.publishedAt && (
          <p className="text-xs text-gray-700">
            {format(post.publishedAt, "yyyy-MM-dd")}
          </p>
        )}
      </div>
    </div>
  );
}
