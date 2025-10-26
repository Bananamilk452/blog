"use client";

import { usePost } from "~/hooks/usePost";

export function PostPage({ id }: { id: string }) {
  const { data: post } = usePost(id);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{post.title}</h1>
      <div
        className="prose dark:prose-invert mt-4"
        dangerouslySetInnerHTML={{ __html: post.content }}
      ></div>
    </div>
  );
}
