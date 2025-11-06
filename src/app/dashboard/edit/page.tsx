import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { EditEditor } from "~/components/dashboard/edit/EditEditor";
import { EditorProvider } from "~/components/providers/EditorProvider";
import { getPost } from "~/lib/actions/post";
import { getQueryClient } from "~/lib/getQueryClient";

export default async function DashboardWritePage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const { id } = await searchParams;
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: ["post", id],
    queryFn: () => getPost(id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EditorProvider>
        <EditEditor />
      </EditorProvider>
    </HydrationBoundary>
  );
}
