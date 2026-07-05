import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
