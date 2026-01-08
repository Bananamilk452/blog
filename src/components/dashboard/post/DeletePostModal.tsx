"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { Posts } from "~/generated/prisma";
import { deletePost as deletePostAction } from "~/lib/actions/post";

interface DeletePostModalProps {
  post: Posts;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function DeletePostModal({ post, open, setOpen }: DeletePostModalProps) {
  const router = useRouter();

  const { mutate: deletePost, status: deletePostStatus } = useMutation({
    mutationFn: (post: Posts) => {
      return deletePostAction(post.id);
    },
    onSuccess: () => {
      toast.success("포스트가 성공적으로 삭제되었습니다.");
      setOpen(false);
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error("포스트 삭제 처리에 실패했습니다. 다시 시도해주세요.");
      console.error(error);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form>
          <DialogHeader>
            <DialogTitle>포스트 삭제</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid gap-4 py-4">
            <span className="text-sm">
              <b className="font-bold">{post.title}</b> 포스트를 정말로
              삭제하시겠습니까?
            </span>
          </div>
          <DialogFooter>
            {deletePostStatus === "pending" && <Spinner className="mr-2" />}
            <Button
              type="button"
              onClick={() => deletePost(post)}
              disabled={deletePostStatus === "pending"}
            >
              삭제
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
              disabled={deletePostStatus === "pending"}
            >
              취소
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
