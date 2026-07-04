"use client";

import { format } from "date-fns";
import DOMPurify from "isomorphic-dompurify";
import { ImageIcon, ReplyIcon, XIcon } from "lucide-react";
import { createContext, useRef, useState, useContext } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

import type { ChangeEvent, ReactNode } from "react";

type MessageActor = {
  name?: string | null;
  username?: string | null;
  handle: string;
  uri: string;
  avatarUrl?: string | null;
};

type MessageReply = {
  isOpen: boolean;
  onToggle: () => void;
  label?: string;
  count?: number;
};

type MessageValue = {
  actor: MessageActor;
  createdAt: Date | string;
  content: string;
  reply?: MessageReply;
};

type MessageAttachment = {
  id: string;
  url: string;
  mediaType?: string | null;
  name?: string | null;
};

const MessageContext = createContext<MessageValue | null>(null);

function useMessage() {
  const message = useContext(MessageContext);
  if (!message) {
    throw new Error("Message components must be rendered inside Message.Root");
  }
  return message;
}

function Root({
  message,
  className,
  children,
}: {
  message: MessageValue;
  className?: string;
  children: ReactNode;
}) {
  return (
    <MessageContext value={message}>
      <div className={cn("flex gap-3", className)}>{children}</div>
    </MessageContext>
  );
}

function Avatar() {
  const { actor } = useMessage();
  const name = actor.name ?? actor.username ?? actor.handle;

  return (
    <div className="shrink-0">
      {actor.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={actor.avatarUrl}
          alt={`${name} avatar`}
          className="size-10 rounded-full border-2 border-(--paper-note)/95 bg-(--accent-muted) object-cover"
        />
      ) : (
        <div className="size-10 rounded-full border-2 border-(--paper-note)/95 bg-(--accent-muted)" />
      )}
    </div>
  );
}

function Main({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 flex-1", className)}>{children}</div>;
}

function Header({ children }: { children?: ReactNode }) {
  const { actor, createdAt } = useMessage();
  const name = actor.name ?? actor.username ?? actor.handle;

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="font-semibold">{name}</span>
      <a
        href={actor.uri}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-(--ink-soft) hover:underline"
      >
        {actor.handle}
      </a>
      <span className="text-xs text-(--ink-soft)">
        {format(new Date(createdAt), "yyyy년 MM월 dd일 HH:mm")}
      </span>
      {children}
    </div>
  );
}

function Content() {
  const { content } = useMessage();
  const sanitizedContent = DOMPurify.sanitize(content);

  return (
    <div className="mt-2">
      <p
        className="wrap-break-words text-base whitespace-pre-wrap [&_a]:text-(--accent-strong) [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </div>
  );
}

function AttachmentImages({ attachments }: { attachments?: MessageAttachment[] }) {
  if (!attachments?.length) return null;

  return (
    <div className="mt-2">
      {attachments.map((attachment) => {
        if (!attachment.mediaType?.startsWith("image/")) return null;

        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={attachment.id}
            src={attachment.url}
            alt={attachment.name || "Message Attachment"}
            className="shadow(--shadow-soft) mt-2 max-h-60 rounded-2xl border-2 border-(--line)"
          />
        );
      })}
    </div>
  );
}

function Actions({ children }: { children?: ReactNode }) {
  return <div className="mt-2 flex items-center gap-4">{children}</div>;
}

function ReplyToggle() {
  const { reply } = useMessage();
  if (!reply) return null;

  return (
    <button
      type="button"
      onClick={reply.onToggle}
      className="flex cursor-pointer items-center gap-1 text-(--ink-soft) hover:text-(--accent-paper)"
    >
      {reply.count != null && <span className="text-sm">{reply.count}</span>}
      {reply.label && <span className="text-sm">{reply.label}</span>}
      <ReplyIcon className="size-4" />
    </button>
  );
}

function ReplyPanel({ children }: { children: ReactNode }) {
  const { reply } = useMessage();
  if (!reply?.isOpen) return null;

  return <div className="mt-4">{children}</div>;
}

function Thread({ children }: { children?: ReactNode }) {
  if (!children) return null;

  return (
    <div className="mt-4 ml-8 flex flex-col gap-4 border-l-2 border-dashed border-(--line) pl-4">
      {children}
    </div>
  );
}

function ReplyFormFrame({
  value,
  pending,
  disabled,
  placeholder = "답글을 입력하세요 (마크다운 지원)...",
  children,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: string;
  pending: boolean;
  disabled?: boolean;
  placeholder?: string;
  children?: ReactNode;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="shadow(--shadow-soft) relative rounded-2xl border-2 border-(--line) bg-(--paper) p-4 before:pointer-events-none before:absolute before:inset-2 before:rounded-[inherit] before:border before:border-dashed before:border-(--accent-paper)/20">
      <form
        className="relative z-10"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Textarea
          className="min-h-24 resize-none"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {children}
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
            취소
          </Button>
          <Button type="submit" size="sm" disabled={pending || disabled}>
            {pending ? "작성 중..." : "답글 작성"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ImageUpload({
  files,
  maxFiles = 4,
  onChange,
}: {
  files: File[];
  maxFiles?: number;
  onChange: (files: File[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`최대 ${maxFiles}개의 이미지까지 첨부할 수 있습니다.`);
      return;
    }

    const nextFiles = [...files, ...selectedFiles];
    onChange(nextFiles);

    const nextPreviews: string[] = [];
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        nextPreviews.push(reader.result as string);
        if (nextPreviews.length === selectedFiles.length) {
          setPreviews((currentPreviews) => [...currentPreviews, ...nextPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function handleRemoveImage(index: number) {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
    setPreviews((currentPreviews) =>
      currentPreviews.filter((_, previewIndex) => previewIndex !== index),
    );
  }

  return (
    <>
      {previews.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={`Preview ${index + 1}`} className="max-h-40 rounded-md" />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
            disabled={files.length >= maxFiles}
          />
          <Button
            disabled={files.length >= maxFiles}
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="size-4" />
            <span>
              이미지 추가 ({files.length}/{maxFiles})
            </span>
          </Button>
        </label>
      </div>
    </>
  );
}

export const Message = {
  Root,
  Avatar,
  Main,
  Header,
  Content,
  AttachmentImages,
  Actions,
  ReplyToggle,
  ReplyPanel,
  Thread,
  ReplyFormFrame,
  ImageUpload,
};
