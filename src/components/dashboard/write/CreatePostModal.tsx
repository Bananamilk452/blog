"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { createPost as createPostAction } from "~/lib/actions/post";

interface CreatePostModalProps {
  title: string;
  content: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CreatePostModal({
  title,
  content,
  open,
  setOpen,
}: CreatePostModalProps) {
  const { mutate: createPost, status: createPostStatus } = useMutation({
    mutationFn: () => {
      return createPostAction({ title, content });
    },
    onError: (error) => {
      toast.error("포스트 작성에 실패했습니다. 다시 시도해주세요.");
      console.error(error);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>포스트 작성</DialogTitle>
        </DialogHeader>
        <div>포스트를 작성하시겠습니까?</div>

        <DialogFooter>
          {createPostStatus === "pending" && <Spinner className="mr-2" />}
          <Button
            type="submit"
            onClick={() => createPost()}
            disabled={createPostStatus === "pending"}
          >
            작성
          </Button>
          {/* <Button
            variant="white"
            type="submit"
            onClick={() => createPost()}
            disabled={createPostStatus === "pending"}
          >
            임시 저장
          </Button> */}
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setOpen(false);
            }}
            disabled={createPostStatus === "pending"}
          >
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
