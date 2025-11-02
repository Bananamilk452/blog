import { z } from "zod";

export const CreatePostFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요."),
  content: z.string().min(1, "내용을 입력해주세요."),
  category: z.string().min(1, "카테고리를 선택해주세요."),
  slug: z.string().min(1, "슬러그를 입력해주세요.").regex(/^[a-z0-9-]+$/, "슬러그는 소문자, 숫자, 하이픈만 사용할 수 있습니다."),
});

export type CreatePostForm = z.infer<typeof CreatePostFormSchema>;
