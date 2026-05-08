"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import TopMenu from "@/components/TopMenu";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const ocultarMenu =
    pathname === "/" ||
    pathname.startsWith("/login");

  return (
    <>
      <main>{children}</main>

      {!ocultarMenu && (
        <>
          <TopMenu />
          <BottomNav />
        </>
      )}
    </>
  );
}