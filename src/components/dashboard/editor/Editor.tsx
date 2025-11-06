"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import { BlockNoteView } from "@blocknote/shadcn";
import { useEffect } from "react";

import { useEditorContext } from "~/components/providers/EditorProvider";
import { Input } from "~/components/ui/input";
import { useEditor } from "~/hooks/useEditor";

export default function Editor() {
  const editor = useEditor();
  const { title, setTitle, setEditor, setContent } = useEditorContext();

  useEffect(() => {
    setEditor(editor);
  }, [editor, setEditor]);

  editor.onChange(() => {
    const html = editor.blocksToFullHTML(editor.document);
    setContent(html);
  });

  return (
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
        className="*:bg-secondary! min-h-0 grow overflow-auto"
        editor={editor}
      />
    </div>
  );
}
