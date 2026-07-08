import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/ui/AppShell";

export const metadata: Metadata = {
  title: {
    default: "MetaPLM Workspace",
    template: "%s | MetaPLM Workspace",
  },
  description: "MetaPLM iş yönetimi: CRM, zaman takibi ve finans",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="flex h-screen overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
