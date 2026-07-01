"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import { InfiniteScrollTrigger } from "../InfiniteScrollTrigger";
import { PAGE_SIZE } from "~/constants";
import { getPosts } from "~/lib/actions/post";

export function PostList() {
  const { data, fetchNextPage, hasNextPage, isFetching } = useSuspenseInfiniteQuery({
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
    <>
      <section className="relative mx-auto mb-8 grid max-w-[880px] gap-4 rounded-[26px] border-2 border-[#d8d0c5] bg-[#fffdf5] p-8 shadow-[var(--shadow)] before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-[#a46d43]/20 max-[900px]:p-5">
        <h1 className="relative z-10 text-3xl font-bold">윤서아의 블로그</h1>
        <p className="relative z-10 m-0 max-w-[36rem] text-[1.05rem] text-[#40342b]">
          종이 위에 메모를 쌓아두듯, 천천히 읽고 오래 남는 글들을 정리하는 공간입니다.
        </p>
        <ul className="relative z-10 m-0 flex list-none flex-wrap gap-2.5 p-0">
          {["기록", "개발", "메모"].map((tag) => (
            <li
              key={tag}
              className="handwritten rounded-full bg-[#a46d43]/10 px-3 py-1 text-[0.9rem] tracking-[0.03em] text-[#655648]"
            >
              {tag}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <div className="mx-auto mb-4 max-w-[880px] px-2">
          <h2 className="text-2xl font-bold">최근 글 목록</h2>
          <p className="muted mt-2">메모장에 꽂아둔 최신 글들</p>
        </div>

        <ul
          className="mx-auto grid max-w-[1000px] list-none grid-cols-1 gap-6 p-0 md:grid-cols-2"
          aria-label="블로그 글 목록"
        >
          {data?.pages.map((page, pageIndex) => (
            <Fragment key={pageIndex}>
              {page.records.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} />
                </li>
              ))}
            </Fragment>
          ))}
        </ul>
      </section>

      <InfiniteScrollTrigger
        onTrigger={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
      />
    </>
  );
}

export function PostCard({
  post,
}: {
  post: Awaited<ReturnType<typeof getPosts>>["records"][number];
}) {
  const excerpt = post.content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return (
    <Link
      href={`/post/${post.slug}`}
      className="group relative grid h-full gap-4 rounded-3xl border-2 border-[#d8d0c5] bg-[#fffdf5] p-5 text-inherit no-underline shadow-[var(--shadow)] transition-[transform,box-shadow] before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-[#a46d43]/20 odd:-rotate-[0.6deg] even:rotate-[0.6deg] hover:-translate-y-1 hover:rotate-0 hover:text-inherit hover:shadow-[0_18px_34px_rgba(70,48,31,0.18)]"
    >
      <div className="relative z-10 aspect-[16/10] overflow-hidden rounded-2xl bg-[#e6d6bf] shadow-[var(--shadow-soft)]">
        {post.banner && (
          <Image
            src={post.banner.url}
            alt={post.title}
            fill={true}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        )}
      </div>
      <div className="relative z-10 grid gap-3">
        {post.publishedAt && (
          <p className="handwritten m-0 text-[0.95rem] text-[#655648]">
            {format(post.publishedAt, "yyyy-MM-dd")}
          </p>
        )}
        <h3 className="text-xl font-bold">{post.title}</h3>
        <p className="text-sm">
          {post.category?.name} - {post.user.name} (@{post.user.username})
        </p>
        {excerpt && <p className="m-0 text-[#655648]">{excerpt}</p>}
      </div>
    </Link>
  );
}
