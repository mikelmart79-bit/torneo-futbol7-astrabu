"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

// deploy test

type Match = {
  id: string;
  match_date: string;
  match_time: string;
  field: string;
  home_team: { name: string };
  away_team: { name: string };
};

export default function InicioPage() {
  const [partidos, setPartidos] = useState<Match[]>([]);
  const [partidoActual, setPartidoActual] = useState(0);

  useEffect(() => {
    async function cargarProximos() {
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
        .limit(8);

      if (!error && data) {
        setPartidos(data as any);
      }
    }

    cargarProximos();
  }, []);

  function anteriorPartido() {
    setPartidoActual((actual) =>
      actual === 0 ? partidos.length - 1 : actual - 1
    );
  }

  function siguientePartido() {
    setPartidoActual((actual) =>
      actual === partidos.length - 1 ? 0 : actual + 1
    );
  }

  const partido = partidos[partidoActual];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <h1 className="whitespace-nowrap text-center text-lg font-black sm:text-xl">
            Torneo Fútbol 7 Astrabudua
          </h1>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
          <div className="bg-red-600 px-5 py-3 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-white">
              Próximos partidos
            </p>
          </div>

          {partido ? (
            <div className="relative p-5">
              {partidos.length > 1 && (
                <>
                  <button
                    onClick={anteriorPartido}
                    className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 text-2xl font-black text-white shadow"
                  >
                    ‹
                  </button>

                  <button
                    onClick={siguientePartido}
                    className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 text-2xl font-black text-white shadow"
                  >
                    ›
                  </button>
                </>
              )}

              <div className="mx-8 rounded-3xl bg-slate-50 px-4 py-4 text-center shadow-inner">
                <p className="text-lg font-black leading-tight text-slate-950">
                  {partido.home_team?.name}
                </p>

                <div className="my-3 flex items-center justify-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />

                  <div className="rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-lg">
                    <p className="text-[11px] font-black uppercase text-slate-300">
                      {formatearFecha(partido.match_date)}
                    </p>
                    <p className="text-3xl font-black">{partido.match_time}</p>
                    <p className="text-xs font-bold text-slate-300">
                      {partido.field}
                    </p>
                  </div>

                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <p className="text-lg font-black leading-tight text-slate-950">
                  {partido.away_team?.name}
                </p>
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
            href="/equipos"
            className="rounded-2xl bg-white/95 p-4 text-lg font-black shadow"
          >
            Equipos
          </a>

          <a
            href="/mvp"
            className="whitespace-nowrap rounded-2xl bg-white/95 p-4 text-base font-black shadow"
          >
            MVP Equipo Ideal
          </a>

          <a
            href="/normativa"
            className="rounded-2xl bg-white/95 p-4 text-lg font-black shadow"
          >
            Normativa
          </a>

          <a
            href="/favoritos"
            className="rounded-2xl bg-white/95 p-4 text-lg font-black shadow"
          >
            Favoritos
          </a>
        </div>

        <a
          href="/admin"
          className="mt-4 block w-full rounded-2xl bg-slate-950 p-4 text-center text-lg font-black text-white shadow"
        >
          Panel admin
        </a>
      </section>
    </main>
  );
}