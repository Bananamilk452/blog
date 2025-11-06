import z from "zod";

export const UpdateUserFormSchema = z.object({
  name: z.string().min(1, "표시 이름을 입력해주세요."),
  avatar: z.instanceof(File).optional(),
});

export type UpdateUserForm = z.infer<typeof UpdateUserFormSchema>;
