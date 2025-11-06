import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  getMainActor,
  updateMainActor as updateMainActorAction,
} from "~/lib/actions/actor";
import { getQueryClient } from "~/lib/getQueryClient";
import {
  UpdateMainActorForm,
  UpdateMainActorFormSchema,
} from "~/types/zod/UpdateMainActorFormSchema";

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
import { Textarea } from "../ui/textarea";
import { ActorCard } from "./ActorCard";

interface UpdateMainActorModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  actor: Awaited<ReturnType<typeof getMainActor>>["actor"];
}

export function UpdateMainActorModal({
  open,
  setOpen,
  actor,
}: UpdateMainActorModalProps) {
  const form = useForm<UpdateMainActorForm>({
    resolver: zodResolver(UpdateMainActorFormSchema),
    defaultValues: {
      name: actor.name || "",
      summary: actor.summary || "",
    },
  });

  // props 바뀌면 form 초기화
  useEffect(() => {
    form.reset({
      name: actor.name || "",
      summary: actor.summary || "",
    });
  }, [actor, form]);

  const { name, summary, avatar, banner } = useWatch({
    control: form.control,
  });

  const avatarObject = useMemo(() => {
    return avatar
      ? {
          id: actor.avatar?.id || "",
          url: URL.createObjectURL(avatar),
          createdAt: actor.avatar?.createdAt || new Date(),
          updatedAt: actor.avatar?.updatedAt || new Date(),
          originalUrl: actor.avatar?.originalUrl || "",
        }
      : actor.avatar;
  }, [actor, avatar]);

  const bannerObject = useMemo(() => {
    return banner
      ? {
          id: actor.banner?.id || "",
          url: URL.createObjectURL(banner),
          createdAt: actor.banner?.createdAt || new Date(),
          updatedAt: actor.banner?.updatedAt || new Date(),
          originalUrl: actor.banner?.originalUrl || "",
        }
      : actor.banner;
  }, [actor, banner]);

  const previewableActor = useMemo(() => {
    return {
      ...actor,
      name: name ?? "",
      summary: summary ?? null,
      avatar: avatarObject,
      banner: bannerObject,
    };
  }, [actor, name, summary, avatarObject, bannerObject]);

  const queryClient = getQueryClient();

  const { mutate: updateMainActor, status } = useMutation({
    mutationFn: () => updateMainActorAction(form.getValues()),
    onSuccess: () => {
      setOpen(false);
      form.reset();
      toast.success("메인 액터가 성공적으로 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["main-actor"] });
    },
    onError: () => {
      toast.error("메인 액터 수정에 실패했습니다. 다시 시도해주세요.");
    },
  });

  const onSubmit = () => updateMainActor();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>메인 액터 수정</DialogTitle>
          <DialogDescription>
            메인 액터의 표시 이름, 소개, 아바타, 배너를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <ActorCard actor={previewableActor} />

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
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>소개</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      placeholder="소개"
                      {...field}
                    />
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

            <FormField
              control={form.control}
              name="banner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>배너</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="배너"
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
