import localFont from "next/font/local";

import "~/lib/zod";
import Providers from "./providers";
import "./globals.css";
import { ThemeProvider } from "~/components/providers/ThemeProvider";
import { Toaster } from "~/components/ui/sonner";

import type { Metadata } from "next";

const jetbrainsMono = localFont({
  src: "./JetBrainsMonoVariable.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-jetbrains-mono",
});

const gyeonggiBatang = localFont({
  src: "./gyeonggibatang-normal.woff2",
  display: "swap",
  weight: "400",
  variable: "--font-gyeonggi-batang",
});

const neucha = localFont({
  src: "../../node_modules/@fontsource/neucha/files/neucha-latin-400-normal.woff2",
  display: "swap",
  weight: "400",
  variable: "--font-neucha",
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
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${gyeonggiBatang.variable} ${neucha.variable} ${jetbrainsMono.variable} min-h-screen min-w-screen`}
    >
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
