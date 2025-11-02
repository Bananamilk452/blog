"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import { BlockNoteView } from "@blocknote/shadcn";

import { useEditorContext } from "~/components/providers/EditorProvider";
import { useEditor } from "~/hooks/useEditor";

export default function Editor() {
  const editor = useEditor();
  const { setContent } = useEditorContext();

  editor.onChange(() => {
    const html = editor.blocksToFullHTML(editor.document);
    setContent(html);
  });

  return (
    <BlockNoteView
      className="*:bg-secondary! min-h-0 grow overflow-auto"
      editor={editor}
    />
  );
}
