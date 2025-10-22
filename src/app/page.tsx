"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { createPost } from "~/lib/actions/post";

export default function Home() {
  const [content, setContent] = useState("");

  function onSubmit() {
    createPost(content).then(() => {
      alert("Post created successfully!");
      setContent("");
    });
  }

  return (
    <div className="flex w-lg flex-col gap-4">
      <Textarea
        className="h-64"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <Button onClick={onSubmit}>Write</Button>
    </div>
  );
}
