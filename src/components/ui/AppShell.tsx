"use client";

import Sidebar from "@/components/ui/Sidebar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { ToastProvider } from "@/components/ui/Toaster";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <ToastProvider>
      {!isLoginPage && <Sidebar />}
      {!isLoginPage && <CommandPalette />}
      <main className={`flex-1 overflow-y-auto relative ${isLoginPage ? "w-full" : ""} pb-16 md:pb-0`}>
        {children}
      </main>
    </ToastProvider>
  );
}
