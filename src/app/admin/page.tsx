"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [equipos, setEquipos] = useState(0);
  const [jugadores, setJugadores] = useState(0);
  const [partidos, setPartidos] = useState(0);
  const [cruces, setCruces] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarResumen() {
      const { count: equiposCount } = await supabase
        .from("teams")
        .select("*", { count: "exact", head: true });

      const { count: jugadoresCount } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true });

      const { count: partidosCount } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true });

      const { count: crucesCount } = await supabase
        .from("final_matches")
        .select("*", { count: "exact", head: true });

      setEquipos(equiposCount ?? 0);
      setJugadores(jugadoresCount ?? 0);
      setPartidos(partidosCount ?? 0);
      setCruces(crucesCount ?? 0);
      setLoading(false);
    }

    cargarResumen();
  }, []);

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

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            <h2 className="text-xl font-black">Resumen</h2>

            {loading ? (
              <p className="mt-4 font-bold text-slate-500">
                Cargando datos...
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
                  <p className="text-3xl font-black text-red-600">{equipos}</p>
                  <p className="text-sm font-bold text-slate-500">Equipos</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
                  <p className="text-3xl font-black text-red-600">
                    {jugadores}
                  </p>
                  <p className="text-sm font-bold text-slate-500">Jugadores</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
                  <p className="text-3xl font-black text-red-600">{partidos}</p>
                  <p className="text-sm font-bold text-slate-500">Partidos</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
                  <p className="text-3xl font-black text-red-600">{cruces}</p>
                  <p className="text-sm font-bold text-slate-500">
                    Eliminatorias
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <Link
              href="/admin/partidos"
              className="rounded-2xl bg-white/95 p-5 text-lg font-black shadow"
            >
              Meter resultados
            </Link>

            <Link
              href="/admin/fase-final"
              className="rounded-2xl bg-white/95 p-5 text-lg font-black shadow"
            >
              Configurar eliminatorias
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