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
        <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-black">
            Torneo Fútbol 7 Astrabudua
          </h1>
        </div>

        <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <p className="text-sm font-black uppercase text-red-600">
            Próximo partido
          </p>

          {partido ? (
            <>
              <div className="mt-3">
                <p className="text-xl font-black">{partido.home_team?.name}</p>
                <p className="text-xl font-black">{partido.away_team?.name}</p>
              </div>

              <div className="mt-2 text-right">
                <p className="text-sm text-slate-500">{partido.match_date}</p>
                <p className="text-lg font-black">{partido.match_time}</p>
                <p className="text-sm text-slate-500">{partido.field}</p>
              </div>

              <a
                href="/partidos"
                className="mt-5 block w-full rounded-xl bg-red-600 py-3 text-center font-bold text-white shadow-lg"
              >
                Ver resultados
              </a>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
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
            href="/equipos"
            className="rounded-2xl bg-white/95 p-4 text-lg font-black shadow"
          >
            Equipos
          </a>

          <a
            href="/mvp"
            className="rounded-2xl bg-white/95 p-4 text-lg font-black shadow"
          >
            MVP
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
          className="mt-5 block w-full rounded-2xl bg-black/85 p-4 text-center text-lg font-black text-white shadow"
        >
          Panel admin
        </a>
      </section>
    </main>
  );
}