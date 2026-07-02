"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createReaction } from "~/lib/actions/post";

export function useCreateReaction() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: Parameters<typeof createReaction>[0]) => createReaction(data),
    onSuccess: () => {
      toast.success("리액션을 보냈습니다.");
      router.refresh();
    },
    onError: (error) => {
      console.error("Failed to create reaction:", error);
      toast.error("리액션 전송에 실패했습니다. 다시 시도해주세요.");
    },
  });
}
