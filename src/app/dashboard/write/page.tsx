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

export default function DashboardWritePage() {
  return (
    <EditorProvider>
      <WriteEditor />
    </EditorProvider>
  );
}

function WriteEditor() {
  const { title, content } = useEditorContext();
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

  const isSaveDisabled = title.trim() === "";

  return (
    <div className="flex h-dvh flex-col">
      <Editor />
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
