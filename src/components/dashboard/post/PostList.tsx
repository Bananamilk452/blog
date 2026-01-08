import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "../../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { PostPaginationList } from "./PostPaginationList";

export function PostList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>글 목록</CardTitle>
        <CardAction>
          <Link href="/dashboard/write">
            <Button>
              <PlusIcon />새 글 작성
            </Button>
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <PostPaginationList includeDraft={true} />
      </CardContent>
    </Card>
  );
}
