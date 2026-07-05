import { GoogleAnalytics } from "@next/third-parties/google";
import localFont from "next/font/local";

import "~/lib/zod";
import Providers from "./providers";
import "./globals.css";
import "./GyeonggiBatang.css";
import { ThemeProvider } from "~/components/providers/ThemeProvider";
import { Toaster } from "~/components/ui/sonner";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "~/lib/seo";

import type { Metadata } from "next";

const jetbrainsMono = localFont({
  src: "./JetBrainsMonoVariable.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-jetbrains-mono",
});

const neucha = localFont({
  src: "../../node_modules/@fontsource/neucha/files/neucha-latin-400-normal.woff2",
  display: "swap",
  weight: "400",
  variable: "--font-neucha",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
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
      className={`${neucha.variable} ${jetbrainsMono.variable} min-h-screen min-w-screen`}
    >
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
        <GoogleAnalytics gaId="G-6KV0E36P4C" />
      </body>
    </html>
  );
}
