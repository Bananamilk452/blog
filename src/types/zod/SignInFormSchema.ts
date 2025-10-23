import { z } from "zod";

export const SignInFormSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type SignInForm = z.infer<typeof SignInFormSchema>;
