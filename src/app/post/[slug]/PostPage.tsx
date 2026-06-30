"use client";

import { format } from "date-fns";
import Image from "next/image";

import { PostDropdownMenu } from "~/components/dashboard/post/PostPaginationList";
import { PostComments } from "~/components/post/PostComment";
import { Badge } from "~/components/ui/badge";
import { Image as ImageType, User } from "~/generated/prisma";
import { usePost } from "~/hooks/usePost";
import { useSession } from "~/hooks/useSession";

type UserWithAvatar = User & {
  avatar: ImageType | null;
};

export function PostPage({ slug }: { slug: string }) {
  const { post, comments } = usePost(slug);
  const { data: session } = useSession();

  return (
    <article className="mx-auto grid w-[min(860px,100%)] gap-5">
      {post.banner && (
        <div className="relative min-h-[300px] overflow-hidden rounded-[28px] shadow-[var(--shadow)] sm:min-h-[420px]">
          <Image
            fill={true}
            className="object-cover"
            src={post.banner.url}
            alt="포스트 배너 이미지"
          />
        </div>
      )}

      <section className="relative rounded-[30px] border-2 border-[#d8d0c5] bg-[#fffdf5]/95 p-8 shadow-[var(--shadow)] before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-[#a46d43]/20 max-[900px]:p-5">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <h1 className="flex items-center gap-2">
            {post.title}
            {post.state === "draft" && <Badge>임시글</Badge>}
          </h1>

          {post.user && session?.user.id === post.user.id && <PostDropdownMenu post={post} />}
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap justify-between gap-4 border-t-2 border-dashed border-[#d8d0c5] pt-5 max-[720px]:flex-col">
          {post.user && <UserBadge user={post.user} />}
          <div className="flex items-center gap-4 text-base max-[720px]:items-start">
            <div>
              <p className="muted m-0">수정일</p>
              <p className="m-0">{format(new Date(post.updatedAt), "yyyy년 MM월 dd일 HH:mm")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative rounded-[30px] border-2 border-[#d8d0c5] bg-[#fffdf5]/95 p-8 shadow-[var(--shadow)] before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-[#a46d43]/20 max-[900px]:p-5">
        <div
          className="relative z-10 prose"
          dangerouslySetInnerHTML={{ __html: post.content }}
        ></div>
      </section>

      <section className="relative rounded-[30px] border-2 border-[#d8d0c5] bg-[#fffdf5]/95 p-8 shadow-[var(--shadow)] before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-[#a46d43]/20 max-[900px]:p-5">
        <div className="relative z-10">
          <h3 className="mb-3">댓글</h3>
          <PostComments comments={comments} slug={slug} />
        </div>
      </section>
    </article>
  );
}

function UserBadge({ user }: { user: UserWithAvatar }) {
  return (
    <div className="flex items-center gap-4">
      {user.avatar ? (
        <Image
          src={user.avatar.url}
          alt="Avatar"
          width={128}
          height={128}
          className="size-17 rounded-full border-4 border-[#fff7cc]/95 object-cover"
        />
      ) : (
        <div className="size-17 rounded-full border-4 border-[#fff7cc]/95 bg-[#e6d6bf]" />
      )}

      <div className="flex flex-col">
        <p className="m-0 font-bold">{user.name}</p>
        <p className="muted m-0 text-sm">@{user.username}</p>
      </div>
    </div>
  );
}
