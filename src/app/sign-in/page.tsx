"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { AuthContainer } from "~/components/auth/AuthContainer";
import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Note } from "~/components/ui/note";
import { authClient } from "~/lib/auth-client";
import { AUTH_MESSAGES } from "~/lib/messages";
import { safeRedirect } from "~/lib/utils";
import { SignInForm, SignInFormSchema } from "~/types/zod/SignInFormSchema";

import type { AuthMessageKeys } from "~/lib/messages";
import type { ComponentVariant } from "~/lib/utils";

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState<{
    content: string;
    variant: ComponentVariant<typeof Note>;
    visible: boolean;
  }>({
    content: "",
    variant: "success",
    visible: false,
  });

  const router = useRouter();

  const form = useForm<SignInForm>({
    resolver: zodResolver(SignInFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignInForm) {
    setNote({ ...note, visible: false });

    const { error } = await authClient.signIn.email(
      {
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: () => {
          startTransition(() => {
            const redirectTo = searchParams.get("redirectTo");
            router.replace(safeRedirect(redirectTo));
          });
        },
      },
    );

    if (error?.code) {
      const code = error.code as AuthMessageKeys;

      // 이메일 인증이 필요한 경우만 info로 표시
      if (code === "EMAIL_NOT_VERIFIED") {
        setNote({
          content: AUTH_MESSAGES[code],
          variant: "info",
          visible: true,
        });
      } else {
        setNote({
          content: AUTH_MESSAGES[code],
          variant: "error",
          visible: true,
        });
      }
    }
  }

  return (
    <AuthContainer>
      <Card>
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>seoa.dev에 로그인!</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              method="post"
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="이메일"
                        autoComplete="email"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="비밀번호"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button type="submit" className="hidden" aria-hidden="true" />
            </form>
          </Form>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            type="button"
            size="lg"
            onClick={form.handleSubmit(onSubmit)}
            disabled={form.formState.isSubmitting || isPending}
          >
            {(form.formState.isSubmitting || isPending) && <Spinner />}
            로그인
          </Button>
        </CardFooter>
      </Card>

      {note.visible && <Note variant={note.variant}>{note.content}</Note>}
    </AuthContainer>
  );
}
