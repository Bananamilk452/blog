"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BackButton } from "~/components/BackButton";
import { UpdatePostModal } from "~/components/dashboard/edit/UpdatePostModal";
import { Editor } from "~/components/dashboard/editor/DynamicEditor";
import { useEditorContext } from "~/components/providers/EditorProvider";
import { Button } from "~/components/ui/button";
import { getPost } from "~/lib/actions/post";

export function EditEditor() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { title, setTitle, editor, content } = useEditorContext();
  const [isUpdatePostModalOpen, setIsUpdatePostModalOpen] = useState(false);

  const { data: post } = useSuspenseQuery({
    queryKey: ["post", id],
    queryFn: () => getPost(id!),
    select: (data) => {
      if (!data) {
        throw new Error("Post not found");
      }

      return data;
    },
  });

  useEffect(() => {
    if (post && editor) {
      setTitle(post.title);
      editor.pasteHTML(post.content);
    }
  }, [post, editor, setTitle]);

  const isSaveDisabled = title.trim() === "";

  return (
    <div className="flex h-dvh flex-col">
      <Editor />
      <div className="bg-accent flex justify-between p-4">
        <BackButton>뒤로가기</BackButton>
        <div className="flex items-center gap-4">
          <Button
            disabled={isSaveDisabled}
            onClick={() => setIsUpdatePostModalOpen(true)}
          >
            수정
          </Button>
          <UpdatePostModal
            post={{
              ...post,
              content,
            }}
            open={isUpdatePostModalOpen}
            setOpen={setIsUpdatePostModalOpen}
          />
        </div>
      </div>
    </div>
  );
}
