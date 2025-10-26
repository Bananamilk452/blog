"use client";

import "@blocknote/core/fonts/inter.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";

import "@blocknote/shadcn/style.css";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CreatePostModal } from "~/components/dashboard/write/CreatePostModal";
import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { createPost as createPostAction } from "~/lib/actions/post";

export default function DashboardWritePage() {
  const [title, setTitle] = useState("");
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

  const editor = useCreateBlockNote();

  const isSaveDisabled = title.trim() === "";

  return (
    <div className="flex h-dvh flex-col">
      <div className="mx-auto flex h-full min-h-0 w-full flex-col py-4 sm:w-2/3">
        <div className="px-[54px] py-2">
          <Input
            placeholder="제목을 입력해주세요"
            className="border-0 bg-transparent! px-0 text-3xl! focus:ring-0! focus:outline-none!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <hr className="m-4 border-gray-600" />

        <BlockNoteView
          className="*:bg-secondary! min-h-0 grow overflow-auto *:h-full"
          editor={editor}
        />
      </div>
      <div className="bg-accent flex justify-between p-4">
        <BackButton />
        <div className="flex items-center gap-4">
          <Button
            disabled={isSaveDisabled}
            onClick={() => setIsCreatePostModalOpen(true)}
          >
            저장
          </Button>
          <CreatePostModal
            title={title}
            content={editor.blocksToFullHTML(editor.document)}
            open={isCreatePostModalOpen}
            setOpen={setIsCreatePostModalOpen}
          />
        </div>
      </div>
    </div>
  );
}

function BackButton() {
  const router = useRouter();

  function onGoBack() {
    if (history.length > 2) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <Button variant="white" onClick={onGoBack}>
      나가기
    </Button>
  );
}
