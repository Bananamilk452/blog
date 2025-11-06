import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Image, User } from "~/generated/prisma";
import { updateUser as updateUserAction } from "~/lib/actions/user";
import { getQueryClient } from "~/lib/getQueryClient";
import {
  UpdateUserForm,
  UpdateUserFormSchema,
} from "~/types/zod/UpdateUserFormSchema";

import { Spinner } from "../Spinner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { UserCard } from "./UserCard";

interface UpdateUserModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  user: User & { avatar: Image | null };
}

export function UpdateUserModal({ open, setOpen, user }: UpdateUserModalProps) {
  const form = useForm<UpdateUserForm>({
    resolver: zodResolver(UpdateUserFormSchema),
    defaultValues: {
      name: user.name || "",
    },
  });

  // props 바뀌면 form 초기화
  useEffect(() => {
    form.reset({
      name: user.name || "",
    });
  }, [user, form]);

  const { name, avatar } = useWatch({
    control: form.control,
  });

  const avatarObject = useMemo(() => {
    return avatar
      ? {
          id: user.avatar?.id || "",
          url: URL.createObjectURL(avatar),
          createdAt: user.avatar?.createdAt || new Date(),
          updatedAt: user.avatar?.updatedAt || new Date(),
          originalUrl: user.avatar?.originalUrl || "",
        }
      : user.avatar;
  }, [user, avatar]);

  const previewableUser = useMemo(() => {
    return {
      ...user,
      name: name ?? "",
      avatar: avatarObject,
    };
  }, [user, name, avatarObject]);

  const queryClient = getQueryClient();

  const { mutate: updateUser, status } = useMutation({
    mutationFn: () =>
      updateUserAction({
        name: name ?? "",
        avatar,
      }),
    onSuccess: () => {
      setOpen(false);
      form.reset();
      toast.success("유저가 성공적으로 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: () => {
      toast.error("유저 수정에 실패했습니다. 다시 시도해주세요.");
    },
  });

  const onSubmit = () => updateUser();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>유저 수정</DialogTitle>
          <DialogDescription>
            현재 로그인한 유저의 표시 이름, 아바타를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <UserCard user={previewableUser} />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>표시 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="표시 이름" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>아바타</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="아바타"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        field.onChange(file || undefined);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <button className="hidden" type="submit" />
          </form>
        </Form>

        <DialogFooter>
          {status === "pending" && <Spinner />}
          <Button onClick={form.handleSubmit(onSubmit)}>수정하기</Button>
          <Button variant="white" onClick={() => setOpen(false)}>
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
