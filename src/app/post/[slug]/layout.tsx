import { DefaultLayout } from "~/layouts/default";

export default function PostIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DefaultLayout>{children}</DefaultLayout>;
}
