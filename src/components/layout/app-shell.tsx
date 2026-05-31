"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { useApp } from "@/lib/store";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav, MobileDrawer } from "./mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-5">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 pb-24 pt-5 lg:px-6 lg:pb-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
