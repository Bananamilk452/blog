"use client";

import { HeartIcon } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { useCreateReaction, useDeleteReaction } from "~/hooks/useCreateReaction";

type Reaction = {
  id: string;
  content: string;
  emojiName: string | null;
  emojiIconUrl: string | null;
  emojiIconMediaType: string | null;
};

const PINNED_EMOJIS = ["❤️", "😂", "👍", "🎉", "🔥", "😮", "😢", "🙏"];
const EMOJIS = ["✨", "🥰", "👏", "🤔", "👀", "💯", "🌸", "🍀", "☕", "🚀", "🫠", "🙌"];

export function ReactionButton({
  targetType,
  targetId,
  reactions,
  canReact = true,
}: {
  targetType: "post" | "comment";
  targetId: string;
  reactions: Reaction[];
  canReact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { mutate: createReaction, status } = useCreateReaction();
  const { mutate: deleteReaction, status: deleteStatus } = useDeleteReaction();
  const groupedReactions = groupReactions(reactions);
  const isPending = status === "pending" || deleteStatus === "pending";

  if (!canReact && groupedReactions.length === 0) return null;

  const handleSelect = (content: string) => {
    createReaction(
      { targetType, targetId, content },
      {
        onSuccess: () => setOpen(false),
      },
    );
  };

  const handleDelete = (content: string) => {
    if (!canReact || isPending) return;
    deleteReaction({ targetType, targetId, content });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canReact && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={isPending}
              className="flex cursor-pointer items-center gap-1 text-(--ink-soft) hover:text-(--accent-paper) disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="이모지 리액션 보내기"
            >
              <HeartIcon className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-72 rounded-2xl border-2 border-(--line) bg-(--paper) p-3"
          >
            <div className="grid gap-3">
              <section>
                <p className="muted mb-2 text-xs font-semibold">자주 쓰는 이모지</p>
                <EmojiGrid emojis={PINNED_EMOJIS} onSelect={handleSelect} disabled={isPending} />
              </section>
              <section>
                <p className="muted mb-2 text-xs font-semibold">이모지</p>
                <EmojiGrid emojis={EMOJIS} onSelect={handleSelect} disabled={isPending} />
              </section>
              <p className="muted text-xs">하트는 ActivityPub Like로 전송됩니다.</p>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {groupedReactions.map((reaction) => (
        <button
          key={reaction.content}
          type="button"
          disabled={!canReact || isPending}
          onClick={() => handleDelete(reaction.content)}
          className="inline-flex items-center gap-1 rounded-full border border-(--line) bg-(--paper-note) px-2 py-0.5 text-sm enabled:cursor-pointer enabled:hover:bg-(--accent-paper)/10 disabled:cursor-default"
          aria-label={`${reaction.label} 리액션 취소`}
        >
          {reaction.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reaction.iconUrl} alt={reaction.label} className="size-4 object-contain" />
          ) : (
            <span>{reaction.label}</span>
          )}
          <span>{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}

function EmojiGrid({
  emojis,
  onSelect,
  disabled,
}: {
  emojis: string[];
  onSelect: (emoji: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(emoji)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-xl text-lg hover:bg-(--paper-note) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function groupReactions(reactions: Reaction[]) {
  const groups = new Map<
    string,
    { content: string; label: string; iconUrl: string | null; count: number }
  >();

  for (const reaction of reactions) {
    const existing = groups.get(reaction.content);

    if (existing) {
      existing.count += 1;
      continue;
    }

    groups.set(reaction.content, {
      content: reaction.content,
      label: reaction.emojiName ?? reaction.content,
      iconUrl: reaction.emojiIconUrl,
      count: 1,
    });
  }

  return [...groups.values()];
}
