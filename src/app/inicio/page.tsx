"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
      const hoy = new Date().toISOString().split("T")[0];

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
        .gte("match_date", hoy)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true })
        .limit(1);

      if (!error && data && data.length > 0) {
        setPartido(data[0] as any);
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
                  <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700">
                    {partido.home_team?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-center text-base font-black leading-tight">
                    {partido.home_team?.name}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-white shadow-lg">
                  <p className="text-xs font-black uppercase text-slate-300">
                    {partido.match_date}
                  </p>
                  <p className="text-2xl font-black">{partido.match_time}</p>
                  <p className="text-xs font-bold text-slate-300">
                    {partido.field}
                  </p>
                </div>

                <div className="text-right">
                  <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-lg font-black text-red-600">
                    {partido.away_team?.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-center text-base font-black leading-tight">
                    {partido.away_team?.name}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">
              No hay partidos próximos
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a
            href="/clasificacion"
            className="rounded-2xl bg-white/95 p-4 text-lg font-black shadow"
          >
            Clasificación
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

          <a
            href="/admin"
            className="rounded-2xl bg-black/85 p-4 text-lg font-black text-white shadow"
          >
            Panel admin
          </a>
        </div>
      </section>
    </main>
  );
}