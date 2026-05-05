"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const ocultarMenu =
    pathname === "/" ||
    pathname.startsWith("/login");

  return (
    <>
      <main>{children}</main>
      {!ocultarMenu && <BottomNav />}
    </>
  );
}