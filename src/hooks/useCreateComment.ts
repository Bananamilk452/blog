"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createComment } from "~/lib/actions/post";
import { CreateCommentForm } from "~/types/zod/CreateCommentFormSchema";

export function useCreateComment(slug: string) {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CreateCommentForm) => createComment(data),
    onSuccess: () => {
      toast.success("답글이 작성되었습니다.");
      router.refresh(); // Revalidate server component
    },
    onError: (error) => {
      console.error("Failed to create comment:", error);
      toast.error("답글 작성에 실패했습니다. 다시 시도해주세요.");
    },
  });
}
