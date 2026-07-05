"use client";

import { format } from "date-fns";
import Image from "next/image";
import { useMemo } from "react";

import { PostDropdownMenu } from "~/components/dashboard/post/PostPaginationList";
import { PostComments } from "~/components/post/PostComment";
import { PostToc, TocHeading } from "~/components/post/PostToc";
import { ReactionButton } from "~/components/post/ReactionButton";
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
  const { contentHtml, headings } = useMemo(() => buildPostToc(post.content), [post.content]);

  return (
    <div className="relative min-h-screen">
      <PostToc headings={headings} />

      <article className="mx-auto grid w-[min(860px,100%)] gap-5">
        {post.banner && (
          <div className="shadow(--shadow) relative min-h-[300px] overflow-hidden rounded-[28px] sm:min-h-[420px]">
            <Image
              fill={true}
              className="object-cover"
              src={post.banner.url}
              alt="포스트 배너 이미지"
            />
          </div>
        )}

        <section className="shadow(--shadow) relative rounded-[30px] border-2 border-(--line) bg-(--paper)/95 p-8 before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-(--accent-paper)/20 max-[900px]:p-5">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              {post.title}
              {post.state === "draft" && <Badge>임시글</Badge>}
            </h1>

            {post.user && session?.user.id === post.user.id && <PostDropdownMenu post={post} />}
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap justify-between gap-4 border-t-2 border-dashed border-(--line) pt-5 max-[720px]:flex-col">
            {post.user && <UserBadge user={post.user} />}
            <div className="flex items-center gap-4 text-base max-[720px]:items-start">
              <div>
                <p className="muted m-0">수정일</p>
                <p className="m-0">{format(new Date(post.updatedAt), "yyyy년 MM월 dd일 HH:mm")}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-5">
            <ReactionButton
              targetType="post"
              targetId={post.id}
              reactions={post.reactions}
              canReact={session?.user.role === "admin"}
            />
          </div>
        </section>

        <section className="shadow(--shadow) relative rounded-[30px] border-2 border-(--line) bg-(--paper)/95 p-8 before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-(--accent-paper)/20 max-[900px]:p-5">
          <div className="relative z-10" dangerouslySetInnerHTML={{ __html: contentHtml }}></div>
        </section>

        <section className="shadow(--shadow) relative rounded-[30px] border-2 border-(--line) bg-(--paper)/95 p-8 before:pointer-events-none before:absolute before:inset-2.5 before:rounded-[inherit] before:border before:border-dashed before:border-(--accent-paper)/20 max-[900px]:p-5">
          <div className="relative z-10">
            <h3 className="mb-3 text-xl font-bold">댓글</h3>
            <PostComments comments={comments} />
          </div>
        </section>
      </article>
    </div>
  );
}

function buildPostToc(content: string): { contentHtml: string; headings: TocHeading[] } {
  const slugCounts = new Map<string, number>();
  const headings: TocHeading[] = [];

  const contentHtml = content.replace(
    /<h([1234])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (match, depth: string, attributes: string, innerHtml: string) => {
      const text = stripHtml(innerHtml).trim();
      const currentId = attributes.match(/\sid=["']([^"']*)["']/i)?.[1]?.trim() ?? "";
      const baseSlug = currentId || slugifyHeading(text) || "section";
      const slug = getUniqueSlug(baseSlug, slugCounts);

      if (text.length > 0) {
        headings.push({ depth: Number(depth), slug, text });
      }

      if (currentId) {
        return match.replace(/\sid=["'][^"']*["']/i, ` id="${slug}"`);
      }

      return `<h${depth}${attributes} id="${slug}">${innerHtml}</h${depth}>`;
    },
  );

  return { contentHtml, headings };
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function slugifyHeading(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getUniqueSlug(slug: string, slugCounts: Map<string, number>) {
  const count = slugCounts.get(slug) ?? 0;
  slugCounts.set(slug, count + 1);

  return count === 0 ? slug : `${slug}-${count + 1}`;
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
          className="size-17 rounded-full border-4 border-(--paper-note)/95 object-cover"
        />
      ) : (
        <div className="size-17 rounded-full border-4 border-(--paper-note)/95 bg-(--accent-muted)" />
      )}

      <div className="flex flex-col">
        <p className="m-0 font-bold">{user.name}</p>
        <p className="muted m-0 text-sm">@{user.username}</p>
      </div>
    </div>
  );
}
