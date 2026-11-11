import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OmeglePlus — Instant Live Video & Text Discovery",
  description: "Instant live video and text discovery with zero confusion. 100% free random chats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
    >
      <body className="min-h-[100dvh] w-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
