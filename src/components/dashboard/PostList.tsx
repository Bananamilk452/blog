import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { PostPaginationList } from "./PostPaginationList";

export function PostList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>글 목록</CardTitle>
      </CardHeader>
      <CardContent>
        <PostPaginationList includeDraft={true} />
      </CardContent>
    </Card>
  );
}
