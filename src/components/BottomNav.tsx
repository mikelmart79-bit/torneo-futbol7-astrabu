"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/inicio", label: "🏠" },
    { href: "/partidos", label: "Partidos" },
    { href: "/clasificacion", label: "Tabla" },
    { href: "/fase-final", label: "Fase final" },
    { href: "/mvp", label: "MVP" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center px-1 py-2 text-center text-[11px] font-black ${
                active ? "text-red-600" : "text-slate-500"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}