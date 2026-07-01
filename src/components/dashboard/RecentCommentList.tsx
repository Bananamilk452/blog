import { format } from "date-fns";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getRecentComments } from "~/lib/actions/post";

const COMMENT_LIMIT = 5;

export async function RecentCommentList() {
  const comments = await getRecentComments(COMMENT_LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 댓글</CardTitle>
      </CardHeader>
      <CardContent>
        {comments.length > 0 ? (
          <ul className="flex flex-col divide-y divide-[#d8d0c5]">
            {comments.map((comment) => {
              const href = comment.url ?? (comment.post.slug ? `/post/${comment.post.slug}` : null);

              return (
                <li key={comment.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">
                        {comment.actor.name ?? comment.actor.username}
                      </span>
                      <span className="text-sm text-[#655648]">{comment.actor.handle}</span>
                    </div>
                    <time
                      className="text-sm text-[#655648]"
                      dateTime={comment.createdAt.toISOString()}
                    >
                      {format(comment.createdAt, "yyyy.MM.dd HH:mm")}
                    </time>
                  </div>

                  <p className="line-clamp-2 text-sm text-[#40342b]">
                    {toPlainText(comment.content)}
                  </p>

                  <div className="text-sm text-[#655648]">
                    {href ? (
                      <Link href={href} className="font-medium text-[#8a4f2a] hover:underline">
                        {comment.post.title}
                      </Link>
                    ) : (
                      <span>{comment.post.title}</span>
                    )}
                    <span>에 달린 댓글</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[#655648]">최근 댓글이 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}

function toPlainText(content: string) {
  return content.replace(/<[^>]*>/g, "").trim() || "내용 없음";
}
