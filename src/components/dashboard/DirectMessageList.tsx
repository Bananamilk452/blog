"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppPagination } from "~/components/AppPagination";
import { Message } from "~/components/message/Message";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { PAGE_SIZE, PAGINATION_SIZE } from "~/constants";
import { createDirectMessageReply, getDirectMessages } from "~/lib/actions/directMessage";

export function DirectMessageList() {
  const [page, setPage] = useState(1);
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set());
  const [replyEditorMessageId, setReplyEditorMessageId] = useState<string | null>(null);
  const [replyByMessageId, setReplyByMessageId] = useState<Record<string, string>>({});
  const [imageFilesByMessageId, setImageFilesByMessageId] = useState<Record<string, File[]>>({});
  const queryClient = useQueryClient();

  const queryOptions = { page, limit: PAGE_SIZE };
  const { data, status } = useQuery({
    queryKey: ["direct-messages", queryOptions],
    queryFn: () => getDirectMessages(queryOptions),
  });

  const { mutate, status: replyStatus } = useMutation({
    mutationFn: createDirectMessageReply,
    onSuccess: async () => {
      setReplyEditorMessageId(null);
      setReplyByMessageId({});
      setImageFilesByMessageId({});
      await queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      toast.success("다이렉트 메세지를 보냈습니다.");
    },
    onError: () => {
      toast.error("다이렉트 메세지 전송에 실패했습니다.");
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {status === "pending" ? (
        <DirectMessageSkeleton />
      ) : data?.records.length ? (
        <ul className="flex flex-col gap-4">
          {data.records.map((thread) => {
            const isExpanded = expandedThreadIds.has(thread.id);
            const hiddenMessageCount = Math.max(thread.messages.length - 3, 0);
            const visibleMessages = isExpanded ? thread.messages : thread.messages.slice(-3);

            return (
              <li
                key={thread.id}
                className="shadow(--shadow-soft) flex flex-col gap-4 rounded-3xl border-2 border-(--line) bg-(--paper) p-5"
              >
                {hiddenMessageCount > 0 && !isExpanded && (
                  <button
                    type="button"
                    className="self-start text-sm font-medium text-(--accent-strong) hover:underline"
                    onClick={() =>
                      setExpandedThreadIds((currentValue) => new Set(currentValue).add(thread.id))
                    }
                  >
                    이전 메세지 {hiddenMessageCount}개 보기
                  </button>
                )}

                {visibleMessages.map((message) => (
                  <ThreadMessage
                    key={message.id}
                    message={message}
                    reply={replyByMessageId[message.id] ?? ""}
                    imageFiles={imageFilesByMessageId[message.id] ?? []}
                    isReplyEditorOpen={replyEditorMessageId === message.id}
                    replyStatus={replyStatus}
                    onToggleReply={() =>
                      setReplyEditorMessageId(
                        replyEditorMessageId === message.id ? null : message.id,
                      )
                    }
                    onCancelReply={() => setReplyEditorMessageId(null)}
                    onReplyChange={(value) =>
                      setReplyByMessageId((currentValue) => ({
                        ...currentValue,
                        [message.id]: value,
                      }))
                    }
                    onImagesChange={(files) =>
                      setImageFilesByMessageId((currentValue) => ({
                        ...currentValue,
                        [message.id]: files,
                      }))
                    }
                    onSubmitReply={() =>
                      mutate({
                        parentId: message.id,
                        recipientActorId: thread.recipientActor.id,
                        content: replyByMessageId[message.id] ?? "",
                        images: imageFilesByMessageId[message.id] ?? [],
                      })
                    }
                  />
                ))}

                {hiddenMessageCount > 0 && isExpanded && (
                  <button
                    type="button"
                    className="self-start text-sm font-medium text-(--accent-strong) hover:underline"
                    onClick={() =>
                      setExpandedThreadIds((currentValue) => {
                        const nextValue = new Set(currentValue);
                        nextValue.delete(thread.id);
                        return nextValue;
                      })
                    }
                  >
                    최신 3개만 보기
                  </button>
                )}

              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-(--line) p-8 text-center text-(--ink-soft)">
          <MailIcon className="size-8" />
          <p>받은 다이렉트 메세지가 없습니다.</p>
        </div>
      )}

      <AppPagination
        total={data?.total ?? 0}
        page={page}
        limit={PAGE_SIZE}
        size={PAGINATION_SIZE}
        onPageChange={(newPage) => setPage(newPage)}
      />
    </div>
  );
}

type DirectMessageThread = Awaited<ReturnType<typeof getDirectMessages>>["records"][number];
type DirectMessageThreadMessage = DirectMessageThread["messages"][number];

function ThreadMessage({
  message,
  reply,
  imageFiles,
  isReplyEditorOpen,
  replyStatus,
  onToggleReply,
  onCancelReply,
  onReplyChange,
  onImagesChange,
  onSubmitReply,
}: {
  message: DirectMessageThreadMessage;
  reply: string;
  imageFiles: File[];
  isReplyEditorOpen: boolean;
  replyStatus: "idle" | "pending" | "error" | "success";
  onToggleReply: () => void;
  onCancelReply: () => void;
  onReplyChange: (value: string) => void;
  onImagesChange: (files: File[]) => void;
  onSubmitReply: () => void;
}) {
  const isOutgoing = message.direction === "outgoing";

  return (
    <Message.Root
      message={{
        actor: {
          name: message.actor.name,
          username: message.actor.username,
          handle: message.actor.handle,
          uri: message.actor.uri,
          avatarUrl: message.actor.avatar?.url,
        },
        createdAt: message.createdAt,
        content: message.content,
        reply: {
          isOpen: isReplyEditorOpen,
          onToggle: onToggleReply,
          label: "답장",
        },
      }}
    >
      <Message.Avatar />
      <Message.Main>
        <Message.Header>
          <Badge variant={isOutgoing ? "outline" : "default"}>
            {isOutgoing ? "보낸 메세지" : "받은 메세지"}
          </Badge>
        </Message.Header>
        <Message.Content />
        <Message.AttachmentImages attachments={message.attachment} />

        <Message.Actions>
          <Message.ReplyToggle />
          {message.url && (
            <a
              href={message.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-(--accent-strong) hover:underline"
            >
              원문 보기
            </a>
          )}
        </Message.Actions>

        <Message.ReplyPanel>
          <Message.ReplyFormFrame
            value={reply}
            pending={replyStatus === "pending"}
            disabled={reply.trim() === ""}
            onChange={onReplyChange}
            onCancel={onCancelReply}
            onSubmit={onSubmitReply}
          >
            <Message.ImageUpload files={imageFiles} onChange={onImagesChange} />
          </Message.ReplyFormFrame>
        </Message.ReplyPanel>
      </Message.Main>
    </Message.Root>
  );
}

function DirectMessageSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-32 w-full" />
      ))}
    </div>
  );
}
