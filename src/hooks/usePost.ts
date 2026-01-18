"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";

import { getCommentsBySlug, getPostBySlug } from "~/lib/actions/post";

export function usePost(id: string) {
  const { data: post, status: postStatus } = useSuspenseQuery({
    queryKey: ["post", id],
    queryFn: () => getPostBySlug(id),
    select: (post) => {
      if (!post) {
        notFound();
      }

      return post;
    },
  });

  const { data: comments, status: commentsStatus } = useSuspenseQuery({
    queryKey: ["post-comments", id],
    queryFn: () => getCommentsBySlug(id),
  });

  return {
    post,
    postStatus,
    comments,
    commentsStatus,
    status: postStatus === "success" && commentsStatus === "success",
  };
}
