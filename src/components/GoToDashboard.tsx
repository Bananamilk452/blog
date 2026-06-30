"use client";

import Link from "next/link";

import { useSession } from "~/hooks/useSession";

export function GoToDashboard() {
  const { data: session } = useSession();

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return <Link href="/dashboard">대시보드</Link>;
}
