"use client";

import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/ui/Sidebar";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="flex h-screen overflow-hidden">
        {!isLoginPage && <Sidebar />}
        <main className={`flex-1 overflow-y-auto relative ${isLoginPage ? "w-full" : ""} ${!isLoginPage ? "md:ml-0 ml-0" : ""} pb-16 md:pb-0`}>
          {children}
        </main>
      </body>
    </html>
  );
}
