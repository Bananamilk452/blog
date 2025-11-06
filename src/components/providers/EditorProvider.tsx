"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";

import { useEditor } from "~/hooks/useEditor";

interface EditorContextType {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  editor?: ReturnType<typeof useEditor>;
  setEditor: (editor: ReturnType<typeof useEditor>) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within EditorProvider");
  }
  return context;
};

interface EditorProviderProps {
  children: ReactNode;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({ children }) => {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [editor, setEditor] = useState<ReturnType<typeof useEditor>>();

  const value = {
    title,
    setTitle,
    content,
    setContent,
    editor,
    setEditor,
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
