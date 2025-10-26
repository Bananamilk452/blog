"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";

import { getPost } from "~/lib/actions/post";

export function usePost(id: string) {
  const { data, status } = useSuspenseQuery({
    queryKey: ["post", id] as const,
    queryFn: () => getPost(id),
    select: (post) => {
      if (!post) {
        notFound();
      }

      return post;
    },
  });

  return { data, status };
}
