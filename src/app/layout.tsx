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
  title: "Property Command Center",
  description: "A rental operations system for Kenyan properties with flexible unit structures, leases, payments, and maintenance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.18),_transparent_34%),linear-gradient(180deg,_#fffaf1_0%,_#fff_40%,_#f7f4ef_100%)] text-slate-950">
        {children}
      </body>
    </html>
  );
}
