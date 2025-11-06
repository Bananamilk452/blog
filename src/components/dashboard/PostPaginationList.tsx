"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { PAGE_SIZE, PAGINATION_SIZE } from "~/constants";
import { getPosts } from "~/lib/actions/post";

import { AppPagination } from "../AppPagination";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

interface PostPaginationListProps {
  includeDraft?: boolean;
}

export function PostPaginationList({ includeDraft }: PostPaginationListProps) {
  const [page, setPage] = useState(1);

  const { data, status } = useQuery({
    queryKey: ["posts", { page, limit: PAGE_SIZE, includeDraft }],
    queryFn: () =>
      getPosts({ page, limit: PAGE_SIZE, include: { draft: includeDraft } }),
  });

  return (
    <div className="flex flex-col gap-4">
      <table>
        <thead>
          <tr className="*:p-2 *:text-left">
            <th>제목</th>
            <th>카테고리</th>
            <th>작성자</th>
          </tr>
        </thead>
        <tbody>
          {status === "pending" ? (
            <PostSkeleton />
          ) : (
            status === "success" &&
            data.records.map((post) => (
              <tr key={post.id} className="*:px-2 *:py-3">
                <td className="md:w-2/3">
                  <div className="flex gap-2">
                    <Link className="group" href={`/post/${post.slug}`}>
                      <span className="font-medium group-hover:underline">
                        {post.title}
                      </span>
                    </Link>
                    {post.state === "draft" && <Badge>임시글</Badge>}
                  </div>
                </td>
                <td>{post.category?.name || ""}</td>
                <td>{post.user.name}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <AppPagination
        total={data?.total ?? 0}
        page={page}
        limit={PAGE_SIZE}
        size={PAGINATION_SIZE}
        onPageChange={(newPage) => setPage(newPage)}
      />
    </div>
  );
}

function PostSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <tr key={index} className="*:px-2 *:py-3">
          <td className="md:w-2/3">
            <Skeleton className="h-4" />
          </td>
          <td>
            <Skeleton className="h-4" />
          </td>
          <td>
            <Skeleton className="h-4" />
          </td>
        </tr>
      ))}
    </>
  );
}
