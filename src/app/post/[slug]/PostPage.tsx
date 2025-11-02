"use client";

import { usePost } from "~/hooks/usePost";

export function PostPage({ slug }: { slug: string }) {
  const { data: post } = usePost(slug);

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
