"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Menu,
  X,
  Home,
  UsersRound,
  CalendarDays,
  ListOrdered,
  Trophy,
  ShieldAlert,
  Star,
  Medal,
  BookOpen,
  LockKeyhole,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    title: "Torneo",
    items: [
      {
        href: "/inicio",
        label: "Inicio",
        icon: Home,
      },
      {
        href: "/normativa",
        label: "Normativa",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Equipos",
    items: [
      {
        href: "/equipos",
        label: "Equipos y plantillas",
        icon: UsersRound,
      },
    ],
  },
  {
    title: "Competición",
    items: [
      {
        href: "/calendario",
        label: "Calendario",
        icon: CalendarDays,
      },
      {
        href: "/clasificacion",
        label: "Clasificación",
        icon: ListOrdered,
      },
      {
        href: "/fase-final",
        label: "Eliminatorias",
        icon: Trophy,
      },
      {
        href: "/sancionados",
        label: "Sancionados",
        icon: ShieldAlert,
      },
    ],
  },
  {
    title: "Premios",
    items: [
      {
        href: "/mvp",
        label: "MVP",
        icon: Star,
      },
      {
        href: "/bota-oro",
        label: "Bota de Oro",
        icon: Medal,
      },
    ],
  },
  {
    title: "Administración",
    items: [
      {
        href: "/admin",
        label: "Panel admin",
        icon: LockKeyhole,
      },
    ],
  },
];

export default function TopMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const enAdmin = pathname.startsWith("/admin");

  function closeMenu() {
    setOpen(false);
  }

  async function cerrarAdmin() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error cerrando sesión admin:", error);
    } finally {
      closeMenu();
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 top-4 z-[70] flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 text-slate-950 shadow-2xl backdrop-blur"
        aria-label="Abrir menú"
      >
        <Menu size={28} strokeWidth={3} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm">
          <button
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={closeMenu}
            aria-label="Cerrar menú"
          />

          <aside className="absolute right-0 top-0 h-full w-[58%] min-w-[230px] max-w-[300px] overflow-y-auto bg-slate-950 text-white shadow-2xl sm:w-1/2">
            <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/95 px-5 py-5 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex max-w-[165px] rounded-2xl bg-white/10 px-3 py-2 shadow">
                    <img
                      src="/logo-menu.png"
                      alt="Torneo Astrabudua"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                </div>

                <button
                  onClick={closeMenu}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white"
                  aria-label="Cerrar menú"
                >
                  <X size={28} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5 pb-24">
              {menuGroups.map((group) => (
                <section key={group.title}>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-red-300">
                    {group.title}
                  </p>

                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;

                      const active =
                        item.href === "/inicio"
                          ? pathname === "/inicio" || pathname === "/"
                          : pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMenu}
                          className={`flex items-center gap-3 rounded-2xl px-4 py-4 shadow ${
                            active
                              ? "bg-red-600 text-white"
                              : "bg-white/10 text-white hover:bg-white/15"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              active
                                ? "bg-white text-red-600"
                                : "bg-white/10 text-red-200"
                            }`}
                          >
                            <Icon size={24} strokeWidth={2.8} />
                          </div>

                          <span className="text-sm font-black">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}

                    {group.title === "Administración" && enAdmin && (
                      <button
                        onClick={cerrarAdmin}
                        className="flex w-full items-center gap-3 rounded-2xl bg-red-600 px-4 py-4 text-left text-white shadow hover:bg-red-700"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-red-600">
                          <LogOut size={24} strokeWidth={2.8} />
                        </div>

                        <span className="text-sm font-black">Salir admin</span>
                      </button>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}