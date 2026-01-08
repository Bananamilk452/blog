"use client";

import { useQuery } from "@tanstack/react-query";
import { EllipsisVerticalIcon, SquarePenIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PAGE_SIZE, PAGINATION_SIZE } from "~/constants";
import { Category, Posts, User } from "~/generated/prisma";
import { getPosts } from "~/lib/actions/post";

import { AppPagination } from "../../AppPagination";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Skeleton } from "../../ui/skeleton";
import { DeletePostModal } from "./DeletePostModal";

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
      <table className="hidden lg:table">
        <thead>
          <tr className="*:p-2 *:text-left">
            <th>제목</th>
            <th>카테고리</th>
            <th>작성자</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {status === "pending" ? (
            <>
              <PostTableSkeleton />
            </>
          ) : (
            status === "success" && (
              <>
                <PostTable posts={data.records} />
              </>
            )
          )}
        </tbody>
      </table>

      <div className="flex lg:hidden">
        {status === "pending" ? (
          <PostCardSkeleton />
        ) : (
          status === "success" && <PostCard posts={data.records} />
        )}
      </div>

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

function PostTableSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <tr key={index} className="*:px-2 *:py-3">
          <td className="md:w-3/5">
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

type Post = Posts & { category: Category | null } & { user: User };

export function PostDropdownMenu({ post }: { post: Post }) {
  const router = useRouter();
  const [isDeletePostModalOpen, setIsDeletePostModalOpen] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-9">
          <EllipsisVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/edit?id=${post.id}`)}
          >
            <SquarePenIcon />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDeletePostModalOpen(true)}>
            <TrashIcon />
            삭제
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>

      <DeletePostModal
        post={post}
        open={isDeletePostModalOpen}
        setOpen={setIsDeletePostModalOpen}
      />
    </DropdownMenu>
  );
}

function PostTable({ posts }: { posts: Post[] }) {
  return (
    <>
      {posts.map((post) => (
        <tr key={post.id} className="*:px-2 *:py-3">
          <td className="md:w-3/5">
            <div className="flex gap-2">
              {post.slug ? (
                <Link href={`/post/${post.slug}`}>
                  <span className="font-medium hover:underline">
                    {post.title}
                  </span>
                </Link>
              ) : (
                <span className="font-medium">{post.title}</span>
              )}
              {post.state === "draft" && <Badge>임시글</Badge>}
            </div>
          </td>
          <td>{post.category?.name || ""}</td>
          <td>{post.user.name}</td>
          <td>
            <PostDropdownMenu post={post} />
          </td>
        </tr>
      ))}
    </>
  );
}

function PostCardSkeleton() {
  return <Skeleton className="h-32 w-full rounded-md" />;
}

function PostCard({ posts }: { posts: Post[] }) {
  return (
    <>
      {posts.map((post) => (
        <div
          className="flex w-full flex-col gap-2 rounded-md bg-gray-300 px-4 pt-4 pb-6 text-black"
          key={post.id}
        >
          <div className="flex items-center">
            <h2 className="flex grow items-center gap-2 font-bold">
              {post.title}
              {post.state === "draft" && <Badge>임시글</Badge>}
            </h2>

            <PostDropdownMenu post={post} />
          </div>
          <p className="text-sm">카테고리: {post.category?.name || "-"}</p>
          <p className="text-sm">작성자: {post.user.name}</p>
        </div>
      ))}
    </>
  );
}
