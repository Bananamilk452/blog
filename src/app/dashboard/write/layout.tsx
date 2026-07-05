import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "글쓰기",
};

export default function DashboardWriteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
