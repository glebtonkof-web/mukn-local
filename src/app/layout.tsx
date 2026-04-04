import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "МУКН | Трафик Enterprise - AI-Powered Traffic Management",
  description: "Modern Next.js traffic management system optimized for AI-powered development with Z.ai. Built with TypeScript, Tailwind CSS, and shadcn/ui.",
  keywords: ["МУКН", "Трафик", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "AI development", "React", "Traffic Management"],
  authors: [{ name: "МУКН Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "МУКН | Трафик Enterprise",
    description: "AI-powered traffic management with modern React stack",
    url: "https://mukn.traffic",
    siteName: "МУКН Трафик",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "МУКН | Трафик Enterprise",
    description: "AI-powered traffic management with modern React stack",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="mukn-theme-preference"
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
