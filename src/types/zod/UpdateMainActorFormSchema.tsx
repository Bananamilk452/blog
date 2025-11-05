import z from "zod";

export const UpdateMainActorFormSchema = z.object({
  name: z.string().min(1, "표시 이름을 입력해주세요."),
  summary: z.string().optional(),
  avatar: z.instanceof(File).optional(),
  banner: z.instanceof(File).optional(),
});

export type UpdateMainActorForm = z.infer<typeof UpdateMainActorFormSchema>;
