"use client";

import { useQuery } from "@tanstack/react-query";
import { BugIcon } from "lucide-react";
import { useState } from "react";

import { AppPagination } from "~/components/AppPagination";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { PAGE_SIZE, PAGINATION_SIZE } from "~/constants";
import { InboxActivityLog } from "~/generated/prisma";
import { getInboxActivityLogs, getInboxActivityLogTypes } from "~/lib/actions/inboxActivityLog";
import { cn } from "~/lib/utils";

const statusLabels: Record<string, string> = {
  received: "수신",
  handled: "처리됨",
  ignored: "무시됨",
  failed: "실패",
};

export function ActivityPubInboxLogList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [activityType, setActivityType] = useState("all");
  const [selectedLog, setSelectedLog] = useState<InboxActivityLog | null>(null);

  const queryOptions = {
    page,
    limit: PAGE_SIZE,
    status: status === "all" ? undefined : status,
    activityType: activityType === "all" ? undefined : activityType,
  };

  const { data, status: queryStatus } = useQuery({
    queryKey: ["inbox-activity-logs", queryOptions],
    queryFn: () => getInboxActivityLogs(queryOptions),
  });

  const { data: activityTypes = [] } = useQuery({
    queryKey: ["inbox-activity-log-types"],
    queryFn: () => getInboxActivityLogTypes(),
  });

  function handleFilterChange(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={status} onValueChange={handleFilterChange(setStatus)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="received">수신</SelectItem>
            <SelectItem value="handled">처리됨</SelectItem>
            <SelectItem value="ignored">무시됨</SelectItem>
            <SelectItem value="failed">실패</SelectItem>
          </SelectContent>
        </Select>

        <Select value={activityType} onValueChange={handleFilterChange(setActivityType)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Activity 타입" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 타입</SelectItem>
            {activityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {queryStatus === "pending" ? (
        <LogListSkeleton />
      ) : data?.records.length ? (
        <>
          <table className="hidden table-fixed lg:table">
            <thead>
              <tr className="*:p-2 *:text-left">
                <th className="w-34">수신 시간</th>
                <th className="w-24">상태</th>
                <th className="w-28">타입</th>
                <th>Actor</th>
                <th>Object</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((log) => (
                <tr key={log.id} className="*:px-2 *:py-3">
                  <td className="text-sm text-(--ink-soft)">{formatDate(log.receivedAt)}</td>
                  <td>
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="font-medium">{log.activityType}</td>
                  <td className="truncate text-sm">{log.actorUri ?? "-"}</td>
                  <td className="truncate text-sm">{log.objectId ?? "-"}</td>
                  <td className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                      자세히
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col gap-3 lg:hidden">
            {data.records.map((log) => (
              <button
                key={log.id}
                className="shadow(--shadow-soft) flex flex-col gap-2 rounded-3xl border-2 border-(--line) bg-(--paper) p-4 text-left text-(--ink)"
                type="button"
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{log.activityType}</span>
                  <StatusBadge status={log.status} />
                </div>
                <p className="text-sm break-all text-(--ink-soft)">
                  {log.actorUri ?? "Actor 없음"}
                </p>
                <p className="text-xs text-(--ink-soft)">{formatDate(log.receivedAt)}</p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-(--line) p-8 text-center text-(--ink-soft)">
          <BugIcon className="size-8" />
          <p>조건에 맞는 수신 로그가 없습니다.</p>
        </div>
      )}

      <AppPagination
        total={data?.total ?? 0}
        page={page}
        limit={PAGE_SIZE}
        size={PAGINATION_SIZE}
        onPageChange={(newPage) => setPage(newPage)}
      />

      <LogDetailDialog log={selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)} />
    </div>
  );
}

function LogListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "failed" ? "destructive" : status === "ignored" ? "outline" : "default"}
      className={cn(status === "handled" && "bg-green-100 text-green-800")}
    >
      {statusLabels[status] ?? status}
    </Badge>
  );
}

function LogDetailDialog({
  log,
  onOpenChange,
}: {
  log: InboxActivityLog | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={log != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>ActivityPub 수신 로그</DialogTitle>
          <DialogDescription>원본 JSON-LD와 처리 결과를 확인합니다.</DialogDescription>
        </DialogHeader>

        {log && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid gap-2 rounded-2xl border border-(--line) p-4 sm:grid-cols-2">
              <Info label="상태" value={<StatusBadge status={log.status} />} />
              <Info label="타입" value={log.activityType} />
              <Info label="수신 시간" value={formatDate(log.receivedAt)} />
              <Info label="처리 시간" value={log.handledAt ? formatDate(log.handledAt) : "-"} />
              <Info label="Activity ID" value={log.activityId ?? "-"} wide />
              <Info label="Actor URI" value={log.actorUri ?? "-"} wide />
              <Info label="Object ID" value={log.objectId ?? "-"} wide />
              {log.errorMessage && <Info label="에러" value={log.errorMessage} wide />}
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="font-bold">Raw JSON-LD</h2>
              <pre className="max-h-[45vh] overflow-auto rounded-2xl bg-black p-4 text-xs whitespace-pre-wrap text-white">
                {JSON.stringify(log.rawJson, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", wide && "sm:col-span-2")}>
      <span className="text-xs text-(--ink-soft)">{label}</span>
      <div className="font-medium break-all">{value}</div>
    </div>
  );
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(date));
}
