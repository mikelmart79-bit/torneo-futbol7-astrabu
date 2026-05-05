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
  const [partidos, setPartidos] = useState<Match[]>([]);
  const [indicePartido, setIndicePartido] = useState(0);

  const partido = partidos[indicePartido] ?? null;

  useEffect(() => {
    async function cargarProximos() {
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
        .limit(10);

      if (!error && data) {
        setPartidos(data as any);
        setIndicePartido(0);
      } else {
        setPartidos([]);
      }
    }

    cargarProximos();
  }, []);

  function anteriorPartido() {
    setIndicePartido((actual) =>
      actual === 0 ? partidos.length - 1 : actual - 1
    );
  }

  function siguientePartido() {
    setIndicePartido((actual) =>
      actual === partidos.length - 1 ? 0 : actual + 1
    );
  }

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
              <div className="grid grid-cols-[40px_1fr_40px] items-center gap-3">
                <button
                  onClick={anteriorPartido}
                  disabled={partidos.length <= 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xl font-black text-white disabled:opacity-30"
                >
                  ‹
                </button>

                <div className="text-center">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <p className="text-base font-black leading-tight">
                      {partido.home_team?.name}
                    </p>

                    <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-white shadow-lg">
                      <p className="text-xs font-black uppercase text-slate-300">
                        {formatearFecha(partido.match_date)}
                      </p>
                      <p className="text-2xl font-black">{partido.match_time}</p>
                      <p className="text-xs font-bold text-slate-300">
                        {partido.field}
                      </p>
                    </div>

                    <p className="text-base font-black leading-tight">
                      {partido.away_team?.name}
                    </p>
                  </div>

                  {partidos.length > 1 && (
                    <p className="mt-4 text-xs font-bold text-slate-500">
                      {indicePartido + 1} de {partidos.length}
                    </p>
                  )}
                </div>

                <button
                  onClick={siguientePartido}
                  disabled={partidos.length <= 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xl font-black text-white disabled:opacity-30"
                >
                  ›
                </button>
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