"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ReactionButton } from "./ReactionButton";
import { Message } from "~/components/message/Message";
import { useCreateComment } from "~/hooks/useCreateComment";
import { useSession } from "~/hooks/useSession";
import { getCommentsBySlug } from "~/lib/actions/post";
import { CreateCommentForm, CreateCommentFormSchema } from "~/types/zod/CreateCommentFormSchema";

type CommentWithActor = Awaited<ReturnType<typeof getCommentsBySlug>>[number];

export function PostComments({ comments }: { comments: CommentWithActor[] }) {
  if (comments.length === 0) {
    return <p className="muted py-8 text-center">아직 댓글이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {comments.map((comment) => (
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
  const { data: session } = useSession();

  const [showReplyEditor, setShowReplyEditor] = useState(false);

  const initialContent =
    [
      comment.actor.handle,
      ...(comment.mentions as { href: string; name: string }[]).map((m) => m.name),
    ].join(" ") + " ";
  const replies = "replies" in comment ? comment.replies : [];

  return (
    <Message.Root
      message={{
        actor: {
          name: comment.actor.name,
          username: comment.actor.username,
          handle: comment.actor.handle,
          uri: comment.actor.uri,
          avatarUrl: comment.actor.avatar?.url,
        },
        createdAt: comment.createdAt,
        content: comment.content,
        reply:
          session?.user.role === "admin"
            ? {
                isOpen: showReplyEditor,
                onToggle: () => setShowReplyEditor(!showReplyEditor),
                count: replies.length,
              }
            : undefined,
      }}
    >
      <Message.Avatar />
      <Message.Main>
        <Message.Header />
        <Message.Content />
        <Message.AttachmentImages attachments={comment.attachment} />

        <Message.Actions>
          <Message.ReplyToggle />
          <ReactionButton
            targetType="comment"
            targetId={comment.id}
            reactions={comment.reactions}
            canReact={session?.user.role === "admin"}
          />
        </Message.Actions>

        <Message.ReplyPanel>
          <ReplyEditor
            initialContent={initialContent}
            postId={comment.postId}
            parentId={comment.id}
            onCancel={() => setShowReplyEditor(false)}
            onSuccess={() => setShowReplyEditor(false)}
          />
        </Message.ReplyPanel>

        <Message.Thread>
          {replies.length > 0 &&
            replies.map((reply) => <CommentItem key={reply.id} comment={reply} />)}
        </Message.Thread>
      </Message.Main>
    </Message.Root>
  );
}

function ReplyEditor({
  initialContent,
  postId,
  parentId,
  onCancel,
  onSuccess,
}: {
  initialContent?: string;
  postId: string;
  parentId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const form = useForm<CreateCommentForm>({
    resolver: zodResolver(CreateCommentFormSchema),
    defaultValues: {
      postId,
      parentId,
      content: initialContent ?? "",
      images: [],
    },
  });

  const { mutate: createComment, status } = useCreateComment();
  const content = form.watch("content");

  function setImages(files: File[]) {
    setImageFiles(files);
    form.setValue("images", files);
  }

  function resetImages() {
    const newFiles: File[] = [];
    setImageFiles(newFiles);
    form.setValue("images", newFiles);
  }

  const handleSubmit = form.handleSubmit((data) => {
    createComment(data, {
      onSuccess: () => {
        form.reset();
        resetImages();
        onSuccess();
      },
    });
  });

  return (
    <Message.ReplyFormFrame
      value={content}
      pending={status === "pending"}
      onChange={(value) => form.setValue("content", value, { shouldDirty: true })}
      onCancel={onCancel}
      onSubmit={handleSubmit}
    >
      {form.formState.errors.content && (
        <p className="mt-2 text-sm text-destructive">{form.formState.errors.content.message}</p>
      )}

      <Message.ImageUpload files={imageFiles} onChange={setImages} />
    </Message.ReplyFormFrame>
  );
}
