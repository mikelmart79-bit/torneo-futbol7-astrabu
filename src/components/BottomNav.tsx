"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Trophy, Star } from "lucide-react";

const items = [
  {
    href: "/inicio",
    label: "Inicio",
    icon: Home,
  },
  {
    href: "/clasificacion",
    label: "Clasificación",
    icon: CalendarDays,
  },
  {
    href: "/fase-final",
    label: "Eliminatorias",
    icon: Trophy,
  },
  {
    href: "/favoritos",
    label: "Favoritos",
    icon: Star,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-white/20 bg-white shadow-2xl">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-20 flex-col items-center justify-center gap-1 text-xs font-black transition ${
                active
                  ? "text-red-600"
                  : "text-slate-500 hover:text-emerald-700"
              }`}
            >
              <Icon size={30} strokeWidth={active ? 3 : 2.3} />
              <span className="leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}