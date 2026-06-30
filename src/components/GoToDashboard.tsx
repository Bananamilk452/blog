"use client";

import Link from "next/link";

import { useSession } from "~/hooks/useSession";

export function GoToDashboard() {
  const { data: session } = useSession();

  if (!session?.user || session.user.role !== "admin") {
    return <Link href="/sign-in">로그인</Link>;
  }

  return <Link href="/dashboard">대시보드</Link>;
}
