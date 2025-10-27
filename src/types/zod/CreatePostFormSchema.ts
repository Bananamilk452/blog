import { z } from "zod";

export const CreatePostFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요."),
  content: z.string().min(1, "내용을 입력해주세요."),
  category: z.string().min(1, "카테고리를 선택해주세요."),
});

export type CreatePostForm = z.infer<typeof CreatePostFormSchema>;
