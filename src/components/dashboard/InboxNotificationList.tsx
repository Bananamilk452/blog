import { format } from "date-fns";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { getInboxNotificationItems } from "~/lib/actions/inboxActivityLog";

const kindBadgeClassName = {
  comment: "bg-blue-100 text-blue-800",
  like: "bg-rose-100 text-rose-800",
  emoji: "bg-amber-100 text-amber-800",
  renote: "bg-green-100 text-green-800",
};

export async function InboxNotificationList() {
  const items = await getInboxNotificationItems(30);

  if (items.length === 0) {
    return <p className="text-sm text-(--ink-soft)">표시할 ActivityPub 알림이 없습니다.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-(--line)">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={kindBadgeClassName[item.kind]}>{item.label}</Badge>
              <span className="font-semibold">{item.actorName}</span>
              <span className="text-sm text-(--ink-soft)">{item.actorHandle}</span>
            </div>
            <time className="text-sm text-(--ink-soft)" dateTime={item.receivedAt.toISOString()}>
              {format(item.receivedAt, "yyyy.MM.dd HH:mm")}
            </time>
          </div>

          <p className="line-clamp-2 text-sm text-(--ink)">{item.content}</p>

          <div className="text-sm text-(--ink-soft)">
            {item.href ? (
              <Link href={item.href} className="font-medium text-(--accent-strong) hover:underline">
                {item.targetTitle}
              </Link>
            ) : (
              <span>{item.targetTitle}</span>
            )}
            <span>에 대한 알림</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
