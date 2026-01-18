import { z } from "zod";

export const CreateCommentFormSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  parentId: z.string().optional(),
  content: z
    .string()
    .min(1, "내용을 입력해주세요")
    .max(5000, "댓글은 5000자를 초과할 수 없습니다"),
  images: z
    .array(z.instanceof(File))
    .max(4, "최대 4개의 이미지까지 첨부할 수 있습니다")
    .optional(),
});

export type CreateCommentForm = z.infer<typeof CreateCommentFormSchema>;
