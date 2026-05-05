"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Match = {
  id: string;
  match_date: string;
  match_time: string;
  field: string;
  home_team: { name: string };
  away_team: { name: string };
};

export default function InicioPage() {
  const [partido, setPartido] = useState<Match | null>(null);

  useEffect(() => {
    async function cargarProximo() {
      const ahora = new Date();
      const hoy = ahora.toISOString().split("T")[0];
      const horaActual = ahora.toTimeString().slice(0, 5);

      const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          match_date,
          match_time,
          field,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `)
        .or(
          `match_date.gt.${hoy},and(match_date.eq.${hoy},match_time.gte.${horaActual})`
        )
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true })
        .limit(1);

      if (!error && data && data.length > 0) {
        setPartido(data[0] as any);
      } else {
        setPartido(null);
      }
    }

    cargarProximo();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <h1 className="text-center text-lg font-black whitespace-nowrap sm:text-xl">
            Torneo Fútbol 7 Astrabudua
          </h1>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
          <div className="bg-red-600 px-5 py-3 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-white">
              Próximo partido
            </p>
          </div>

          {partido ? (
            <div className="p-5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="text-left">
                  <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-lg font-black text-white shadow">
                    {partido.home_team?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-center text-base font-black leading-tight">
                    {partido.home_team?.name}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-white shadow-lg">
                  <p className="text-xs font-black uppercase text-slate-300">
                    {formatearFecha(partido.match_date)}
                  </p>
                  <p className="text-2xl font-black">{partido.match_time}</p>
                  <p className="text-xs font-bold text-slate-300">
                    {partido.field}
                  </p>
                </div>

                <div className="text-right">
                  <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-black text-white shadow">
                    {partido.away_team?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-center text-base font-black leading-tight">
                    {partido.away_team?.name}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="p-5 text-center text-sm font-bold text-slate-500">
              No hay partidos próximos
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a
            href="/equipos"
            className="rounded-2xl bg-white/95 p-4 text-lg font-black shadow"
          >
            Equipos
          </a>

          <a
            href="/favoritos"
            className="rounded-2xl bg-white/95 p-4 text-lg font-black shadow"
          >
            Favoritos
          </a>

          <a
            href="/mvp"
            className="rounded-2xl bg-white/95 p-4 text-lg font-black shadow"
          >
            7 Ideal
            <span className="block text-sm font-bold text-red-600">
              MVP
            </span>
          </a>

          <a
            href="/normativa"
            className="rounded-2xl bg-white/95 p-4 text-lg font-black shadow"
          >
            Normativa
          </a>
        </div>

        <a
          href="/admin"
          className="mt-5 block w-full rounded-2xl bg-red-600 p-4 text-center text-lg font-black text-white shadow"
        >
          Panel admin
        </a>
      </section>
    </main>
  );
}