"use client";

import Image from "next/image";

import { Image as ImageType, User } from "~/generated/prisma";
import { usePost } from "~/hooks/usePost";

type UserWithAvatar = User & {
  avatar: ImageType | null;
};

export function PostPage({ slug }: { slug: string }) {
  const { data: post } = usePost(slug);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold sm:text-4xl">{post.title}</h1>

      {post.user && <UserBadge user={post.user} />}

      <hr className="border-gray-600" />

      <div
        className="prose dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: post.content }}
      ></div>
    </div>
  );
}

function UserBadge({ user }: { user: UserWithAvatar }) {
  return (
    <div className="flex items-center gap-3">
      {user.avatar ? (
        <Image
          src={user.avatar.url}
          alt="Avatar"
          width={128}
          height={128}
          className="size-12 rounded-full"
        />
      ) : (
        <div className="size-12 rounded-full bg-gray-300" />
      )}

      <div className="flex flex-col">
        <h2 className="font-bold">{user.name}</h2>
        <p className="text-sm">@{user.username}</p>
      </div>
    </div>
  );
}
