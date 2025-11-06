"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { SquarePenIcon } from "lucide-react";
import { useState } from "react";

import { getUser } from "~/lib/actions/user";

import { Button } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { UpdateUserModal } from "./UpdateUserModal";
import { UserCard } from "./UserCard";

export function ManageUser() {
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const { data: user } = useSuspenseQuery({
    queryKey: ["user"],
    queryFn: () => getUser(),
    select: (data) => {
      if (!data) {
        throw new Error("User not found");
      }

      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>유저 프로필</CardTitle>
        <CardDescription>
          현재 로그인한 유저의 프로필 정보를 관리합니다.
        </CardDescription>

        <CardAction>
          <Button onClick={() => setIsUpdateModalOpen(true)}>
            <SquarePenIcon />
            수정
          </Button>
          <UpdateUserModal
            open={isUpdateModalOpen}
            setOpen={setIsUpdateModalOpen}
            user={user}
          />
        </CardAction>
      </CardHeader>

      <CardContent>
        <UserCard user={user} />
      </CardContent>
    </Card>
  );
}
