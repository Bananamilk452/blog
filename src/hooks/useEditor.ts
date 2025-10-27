"use client";

import { useCreateBlockNote } from "@blocknote/react";

import { uploadFile } from "~/lib/actions/s3";

export function useEditor() {
  const editor = useCreateBlockNote({
    uploadFile: uploadFile,
  });

  return editor;
}
