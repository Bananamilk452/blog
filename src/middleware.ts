import { fedifyWith } from "@fedify/next";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { federation } from "./federation";
import { auth } from "./lib/auth";

export default fedifyWith(federation)(async (req) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const url = new URL(req.url);

  // /dashboard로 시작하는 URL은 인증이 필요
  if (url.pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(
        new URL(`/sign-in?redirectTo=${url.pathname}`, req.url),
      );
    } else if (session.user.role !== "admin") {
      return Response.json(
        { message: "관리자 권한이 필요합니다." },
        { status: 403 },
      );
    }
  }
});

// This config must be defined on `middleware.ts`.
export const config = {
  runtime: "nodejs",
  matcher: [
    {
      source: "/dashboard/:path*",
    },
    {
      source: "/:path*",
      has: [
        {
          type: "header",
          key: "Accept",
          value: ".*application\\/((jrd|activity|ld)\\+json|xrd\\+xml).*",
        },
      ],
    },
    {
      source: "/:path*",
      has: [
        {
          type: "header",
          key: "content-type",
          value: ".*application\\/((jrd|activity|ld)\\+json|xrd\\+xml).*",
        },
      ],
    },
    { source: "/.well-known/nodeinfo" },
    { source: "/.well-known/x-nodeinfo2" },
  ],
};
