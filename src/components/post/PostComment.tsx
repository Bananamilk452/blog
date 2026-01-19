"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import DOMPurify from "isomorphic-dompurify";
import {
  HeartIcon,
  ImageIcon,
  Repeat2Icon,
  ReplyIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Textarea } from "~/components/ui/textarea";
import { useCreateComment } from "~/hooks/useCreateComment";
import { getCommentsBySlug } from "~/lib/actions/post";
import {
  CreateCommentForm,
  CreateCommentFormSchema,
} from "~/types/zod/CreateCommentFormSchema";

type CommentWithActor = Awaited<ReturnType<typeof getCommentsBySlug>>[number];

export function PostComments({
  comments,
  slug,
}: {
  comments: CommentWithActor[];
  slug: string;
}) {
  const topLevelComments = comments.filter((comment) => !comment.parentId);

  if (comments.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">아직 댓글이 없습니다.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {topLevelComments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} slug={slug} />
      ))}
    </div>
  );
}

function CommentItem({
  comment,
  slug,
}: {
  comment: CommentWithActor | CommentWithActor["replies"][number];
  slug: string;
}) {
  const [showReplyEditor, setShowReplyEditor] = useState(false);

  const content = DOMPurify.sanitize(comment.content);
  const initialContent =
    [
      comment.actor.handle,
      ...(comment.mentions as { href: string; name: string }[]).map(
        (m) => m.name,
      ),
    ].join(" ") + " ";

  return (
    <div className="flex gap-3">
      <div className="shrink-0">
        {comment.actor.avatar && comment.actor.avatar.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.actor.avatar.url}
            alt={`${comment.actor.name} avatar`}
            className="size-10 rounded-full bg-gray-300"
          />
        ) : (
          <div className="size-10 rounded-full bg-gray-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-semibold">{comment.actor.name}</span>
          <Link
            href={comment.actor.uri}
            target="_blank"
            className="text-sm text-gray-500 hover:underline"
          >
            {comment.actor.handle}
          </Link>
          <span className="text-xs text-gray-500">
            {format(new Date(comment.createdAt), "yyyy년 MM월 dd일 HH:mm")}
          </span>
        </div>

        <div className="mt-2">
          <p
            className="wrap-break-words dark:prose-invert text-base whitespace-pre-wrap [&_a]:text-blue-500 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        <div className="mt-2">
          {comment.attachment &&
            comment.attachment.length > 0 &&
            comment.attachment.map((att) => {
              if (att.mediaType?.startsWith("image/")) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={att.id}
                    src={att.url}
                    alt={att.name || "Comment Attachment"}
                    className="mt-2 max-h-60 rounded-md"
                  />
                );
              }
            })}
        </div>

        <div className="mt-2 flex items-center gap-4">
          <ReplyButton
            comment={comment}
            onToggle={() => setShowReplyEditor(!showReplyEditor)}
          />
          <RenoteButton comment={comment} />
          <LikeButton comment={comment} />
        </div>

        {showReplyEditor && (
          <div className="mt-4">
            <ReplyEditor
              initialContent={initialContent}
              postId={comment.postId}
              parentId={comment.id}
              slug={slug}
              onCancel={() => setShowReplyEditor(false)}
              onSuccess={() => setShowReplyEditor(false)}
            />
          </div>
        )}

        {"replies" in comment &&
          comment.replies &&
          comment.replies.length > 0 && (
            <div className="mt-4 ml-8 flex flex-col gap-4 border-l-2 border-gray-200 pl-4">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} slug={slug} />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

function ReplyButton({
  comment,
  onToggle,
}: {
  comment: CommentWithActor | CommentWithActor["replies"][number];
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex cursor-pointer items-center gap-1 text-gray-500 hover:text-gray-400"
    >
      <span className="text-sm">
        {"replies" in comment && comment.replies.length}
      </span>
      <ReplyIcon className="size-4" />
    </button>
  );
}

function RenoteButton({
  comment,
}: {
  comment: CommentWithActor | CommentWithActor["replies"][number];
}) {
  return (
    <button className="flex cursor-pointer items-center gap-1 text-gray-500 hover:text-gray-400">
      <Repeat2Icon className="size-4" />
    </button>
  );
}

function LikeButton({
  comment,
}: {
  comment: CommentWithActor | CommentWithActor["replies"][number];
}) {
  return (
    <button className="flex cursor-pointer items-center gap-1 text-gray-500 hover:text-gray-400">
      <HeartIcon className="size-4" />
    </button>
  );
}

function ReplyEditor({
  initialContent,
  postId,
  parentId,
  slug,
  onCancel,
  onSuccess,
}: {
  initialContent?: string;
  postId: string;
  parentId: string;
  slug: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const form = useForm<CreateCommentForm>({
    resolver: zodResolver(CreateCommentFormSchema),
    defaultValues: {
      postId,
      parentId,
      content: initialContent ?? "",
      images: [],
    },
  });

  const { mutate: createComment, status } = useCreateComment(slug);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check total count (existing + new)
    if (imageFiles.length + files.length > 4) {
      toast.error("최대 4개의 이미지까지 첨부할 수 있습니다.");
      return;
    }

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);
    form.setValue("images", newFiles);

    // Create previews for new files
    const newPreviews: string[] = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === files.length) {
          setImagePreviews([...imagePreviews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
    form.setValue("images", newFiles);
  };

  const handleSubmit = form.handleSubmit((data) => {
    createComment(data, {
      onSuccess: () => {
        form.reset();
        setImageFiles([]);
        setImagePreviews([]);
        onSuccess();
      },
    });
  });

  return (
    <div className="rounded-lg border border-gray-900 bg-gray-800 p-4">
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="답글을 입력하세요 (마크다운 지원)..."
                    className="min-h-24 resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="max-h-40 rounded-md"
                  />
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

          {/* File Input */}
          <div className="mt-2 flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                disabled={imageFiles.length >= 4}
              />
              <Button disabled={imageFiles.length >= 4} type="button">
                <ImageIcon className="size-4" />
                <span>이미지 추가 ({imageFiles.length}/4)</span>
              </Button>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={status === "pending"}
            >
              취소
            </Button>
            <Button type="submit" size="sm" disabled={status === "pending"}>
              {status === "pending" ? "작성 중..." : "답글 작성"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
