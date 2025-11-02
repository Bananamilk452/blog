"use client";

import { useState } from "react";

import { BackButton } from "~/components/BackButton";
import { CreatePostModal } from "~/components/dashboard/write/CreatePostModal";
import { Editor } from "~/components/dashboard/write/DynamicEditor";
import {
  EditorProvider,
  useEditorContext,
} from "~/components/providers/EditorProvider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export default function DashboardWritePage() {
  return (
    <EditorProvider>
      <WriteEditor />
    </EditorProvider>
  );
}

function WriteEditor() {
  const { title, setTitle, content } = useEditorContext();
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

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

        <Editor />
      </div>
      <div className="bg-accent flex justify-between p-4">
        <BackButton>뒤로가기</BackButton>
        <div className="flex items-center gap-4">
          <Button
            disabled={isSaveDisabled}
            onClick={() => setIsCreatePostModalOpen(true)}
          >
            저장
          </Button>
          <CreatePostModal
            title={title}
            content={content}
            open={isCreatePostModalOpen}
            setOpen={setIsCreatePostModalOpen}
          />
        </div>
      </div>
    </div>
  );
}
