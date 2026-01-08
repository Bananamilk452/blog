"use client";

import { format } from "date-fns";
import Image from "next/image";

import { PostDropdownMenu } from "~/components/dashboard/PostPaginationList";
import { Badge } from "~/components/ui/badge";
import { Image as ImageType, User } from "~/generated/prisma";
import { usePost } from "~/hooks/usePost";
import { authClient } from "~/lib/auth-client";

type UserWithAvatar = User & {
  avatar: ImageType | null;
};

export function PostPage({ slug }: { slug: string }) {
  const { data: post } = usePost(slug);
  const session = authClient.useSession();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
        {post.title}

        {post.state === "draft" && <Badge>임시글</Badge>}
      </h1>

      {post.user && (
        <div className="flex items-center justify-between">
          <UserBadge user={post.user} />
          {session.data?.user.id === post.user.id && (
            <PostDropdownMenu post={post} />
          )}
        </div>
      )}

      <p className="text-sm">
        마지막 수정일:{" "}
        {format(new Date(post.updatedAt), "yyyy년 MM월 dd일 hh:mm")}
      </p>

      <hr className="border-gray-600" />

      {post.banner && (
        <div className="relative min-h-[300px] w-full">
          <Image
            fill={true}
            className="object-contain"
            src={post.banner.url}
            alt="포스트 배너 이미지"
          />
        </div>
      )}

      <div
        className="dark:prose-invert prose"
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
