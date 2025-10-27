"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import { CreatableCombobox } from "~/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  createPost as createPostAction,
  getCategories,
} from "~/lib/actions/post";
import {
  CreatePostForm,
  CreatePostFormSchema,
} from "~/types/zod/CreatePostFormSchema";

interface CreatePostModalProps {
  title: string;
  content: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CreatePostModal({
  title,
  content,
  open,
  setOpen,
}: CreatePostModalProps) {
  const router = useRouter();

  const form = useForm<CreatePostForm>({
    resolver: zodResolver(CreatePostFormSchema),
    defaultValues: {
      title,
      content,
      category: "",
    },
  });

  useEffect(() => {
    if (title || content) {
      form.reset({
        title,
        content,
        category: form.getValues("category") || "",
      });
    }
  }, [title, content, form]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const categoryOptions = useMemo(() => {
    return categories
      ? categories.map((c) => ({ label: c.name, value: c.name }))
      : [];
  }, [categories]);

  const { mutate: createPost, status: createPostStatus } = useMutation({
    mutationFn: (data: {
      title: string;
      content: string;
      state: string;
      category: string;
    }) => {
      return createPostAction(data);
    },
    onSuccess: (data, variables) => {
      if (variables.state === "published") {
        toast.success("포스트가 성공적으로 작성되었습니다.");
        router.push(`/post/${data.id}`);
      } else if (variables.state === "draft") {
        toast.success("포스트가 임시 저장되었습니다.");
        router.push("/dashboard");
      }
    },
    onError: (error) => {
      toast.error("포스트 처리에 실패했습니다. 다시 시도해주세요.");
      console.error(error);
    },
  });

  const handleSubmit = (state: "draft" | "published") => {
    const values = form.getValues();
    createPost({ ...values, state });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form>
            <DialogHeader>
              <DialogTitle>포스트 발행</DialogTitle>
            </DialogHeader>
            <div className="mt-2 grid gap-4 py-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리</FormLabel>
                    <FormControl>
                      <CreatableCombobox
                        options={categoryOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="카테고리를 선택 또는 입력하세요..."
                        searchPlaceholder="카테고리 검색..."
                        emptyPlaceholder="일치하는 카테고리가 없습니다."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              {createPostStatus === "pending" && <Spinner className="mr-2" />}
              <Button
                type="button"
                onClick={form.handleSubmit(() => handleSubmit("published"))}
                disabled={createPostStatus === "pending"}
              >
                발행
              </Button>
              <Button
                variant="white"
                type="button"
                onClick={form.handleSubmit(() => handleSubmit("draft"))}
                disabled={createPostStatus === "pending"}
              >
                임시 저장
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
                disabled={createPostStatus === "pending"}
              >
                취소
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
