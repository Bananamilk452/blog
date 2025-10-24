import localFont from "next/font/local";

import "~/lib/zod";

import type { Metadata } from "next";

import "./globals.css";

import { ThemeProvider } from "~/components/providers/ThemeProvider";
import { Toaster } from "~/components/ui/sonner";

import Providers from "./providers";

const pretendard = localFont({
  src: "./PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

const jetbrainsMono = localFont({
  src: "./JetBrainsMonoVariable.ttf",
  display: "swap",
  weight: "100 900",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "블로그",
  description: "블로그",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${pretendard.className} ${jetbrainsMono.variable} bg-secondary antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
