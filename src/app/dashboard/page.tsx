import { PostPaginationList } from "~/components/dashboard/PostPaginationList";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DefaultLayout } from "~/layouts/default";

export default function DashboardPage() {
  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">대시보드</h1>

        <Card>
          <CardHeader>
            <CardTitle>글 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <PostPaginationList includeDraft={true} />
          </CardContent>
        </Card>
      </div>
    </DefaultLayout>
  );
}
