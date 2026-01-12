"use client";

import { format } from "date-fns";
import DOMPurify from "dompurify";
import Image from "next/image";

import { getCommentsBySlug } from "~/lib/actions/post";

type CommentWithActor = Awaited<ReturnType<typeof getCommentsBySlug>>[number];

export function PostComments({ comments }: { comments: CommentWithActor[] }) {
  const topLevelComments = comments.filter((comment) => !comment.parentId);

  if (comments.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">아직 댓글이 없습니다.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {topLevelComments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}

function CommentItem({
  comment,
}: {
  comment: CommentWithActor | CommentWithActor["replies"][number];
}) {
  const isEdited =
    new Date(comment.createdAt).getTime() !==
    new Date(comment.updatedAt).getTime();

  const content = DOMPurify.sanitize(comment.content);

  return (
    <div className="flex gap-3">
      <div className="shrink-0">
        {comment.actor.avatar && comment.actor.avatar.url ? (
          <Image
            src={comment.actor.avatar.url}
            alt={`${comment.actor.name} avatar`}
            width={40}
            height={40}
            className="size-10 rounded-full bg-gray-300"
          />
        ) : (
          <div className="size-10 rounded-full bg-gray-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-semibold">{comment.actor.name}</span>
          <span className="text-sm text-gray-500">{comment.actor.handle}</span>
          <span className="text-xs text-gray-500">
            {format(new Date(comment.createdAt), "yyyy년 MM월 dd일 HH:mm")}
          </span>
          {isEdited && <span className="text-xs text-gray-400">(수정됨)</span>}
        </div>

        <div className="mt-2">
          <p
            className="wrap-break-words dark:prose-invert text-base whitespace-pre-wrap [&_a]:text-blue-500 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {"replies" in comment &&
          comment.replies &&
          comment.replies.length > 0 && (
            <div className="mt-4 ml-8 flex flex-col gap-4 border-l-2 border-gray-200 pl-4">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
