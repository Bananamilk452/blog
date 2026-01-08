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
import { Input } from "~/components/ui/input";
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
      slug: "",
    },
  });

  // props 변경 시 form 값 업데이트
  useEffect(() => {
    if (title || content) {
      form.reset({
        title,
        content,
        category: form.getValues("category") || "",
        slug: form.getValues("slug") || "",
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
    mutationFn: () => {
      return createPostAction(form.getValues());
    },
    onSuccess: (data) => {
      if (data.state === "published") {
        toast.success("포스트가 성공적으로 작성되었습니다.");
        router.push(`/post/${data.slug}`);
      } else if (data.state === "draft") {
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
    form.setValue("state", state);

    if (state === "draft") {
      // optional 처리를 위해 empty string이면 undefined으로 설정
      if (form.getValues("category") === "") {
        form.setValue("category", undefined);
      }
      if (form.getValues("slug") === "") {
        form.setValue("slug", undefined);
      }
    }

    // 그 다음 제출
    form.handleSubmit(() => createPost())();
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
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>슬러그</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="게시물 슬러그..."
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          const sanitizedValue = value
                            .toLowerCase()
                            .replace(/\s+/g, "-")
                            .replace(/[^a-z0-9-]/g, "");
                          field.onChange(sanitizedValue);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="banner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>배너 이미지</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          field.onChange(file || null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* content 에러 메세지 표시용 */}
              <FormField
                control={form.control}
                name="content"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              {createPostStatus === "pending" && <Spinner className="mr-2" />}
              <Button
                type="button"
                onClick={() => handleSubmit("published")}
                disabled={createPostStatus === "pending"}
              >
                발행
              </Button>
              <Button
                variant="white"
                type="button"
                onClick={() => handleSubmit("draft")}
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
