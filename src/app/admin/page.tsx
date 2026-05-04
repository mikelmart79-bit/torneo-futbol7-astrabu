"use client";

import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

export default function AdminPage() {
  return (
    <AdminGuard>
      <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />

        <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
          <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
            <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
              Torneo Fútbol 7 Astrabudua
            </p>
            <h1 className="mt-2 text-center text-3xl font-black">
              Panel admin
            </h1>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <Link
              href="/admin/partidos"
              className="rounded-2xl bg-white/95 p-5 text-lg font-black shadow"
            >
              Resultados
            </Link>

            <Link
              href="/admin/fase-final"
              className="rounded-2xl bg-white/95 p-5 text-lg font-black shadow"
            >
              Configurar eliminatorias
            </Link>

            <Link
              href="/admin/grupos"
              className="rounded-2xl bg-white/95 p-5 text-lg font-black shadow"
            >
              Gestionar grupos
            </Link>

            <Link
              href="/admin/equipos"
              className="rounded-2xl bg-white/95 p-5 text-lg font-black shadow"
            >
              Gestionar equipos
            </Link>

            <Link
              href="/admin/jugadores"
              className="rounded-2xl bg-white/95 p-5 text-lg font-black shadow"
            >
              Gestionar jugadores
            </Link>

            <Link
              href="/admin/mvp"
              className="rounded-2xl bg-white/95 p-5 text-lg font-black shadow"
            >
              Votaciones MVP
            </Link>

            <Link
              href="/admin/normativa"
              className="rounded-2xl bg-white/95 p-5 text-lg font-black shadow"
            >
              Editar normativa
            </Link>
          </div>
        </section>
      </main>
    </AdminGuard>
  );
}