"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ocultarMenu = pathname === "/";

  return (
    <>
      <main>{children}</main>
      {!ocultarMenu && <BottomNav />}
    </>
  );
}