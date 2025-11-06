"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { SquarePenIcon } from "lucide-react";
import { useState } from "react";

import { getMainActor } from "~/lib/actions/actor";

import { Button } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ActorCard } from "./ActorCard";
import { UpdateMainActorModal } from "./UpdateMainActorModal";

export function ManageMainActor() {
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const { data: actor } = useSuspenseQuery({
    queryKey: ["main-actor"],
    queryFn: () => getMainActor(),
    select: (data) => data.actor,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>메인 액터</CardTitle>
        <CardDescription>
          블로그의 연합우주 계정인 메인 액터를 관리합니다.
        </CardDescription>

        <CardAction>
          <Button onClick={() => setIsUpdateModalOpen(true)}>
            <SquarePenIcon />
            수정
          </Button>

          <UpdateMainActorModal
            open={isUpdateModalOpen}
            setOpen={setIsUpdateModalOpen}
            actor={actor}
          />
        </CardAction>
      </CardHeader>

      <CardContent>
        <ActorCard actor={actor} />
      </CardContent>
    </Card>
  );
}
