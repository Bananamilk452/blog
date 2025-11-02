import { z } from "zod";

export const SignInFormSchema = z.object({
  email: z
    .email({ error: "이메일 형식이 올바르지 않습니다." })
    .min(1, { error: "이메일을 입력해주세요." }),
  password: z
    .string({ error: "비밀번호 형식이 올바르지 않습니다." })
    .min(1, { error: "비밀번호를 입력해주세요." }),
});

export type SignInForm = z.infer<typeof SignInFormSchema>;
