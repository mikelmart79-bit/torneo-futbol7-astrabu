"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Match = {
  id: string;
  group_name: string;
  match_date: string;
  match_time: string;
  field: string;
  status: string;
  home_team: { name: string };
  away_team: { name: string };
};

export default function PartidosPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarPartidos() {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          id,
          group_name,
          match_date,
          match_time,
          field,
          status,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `
        )
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setMatches(data as any);
      }

      setLoading(false);
    }

    cargarPartidos();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo"
        className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-20">
        <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-black">Partidos</h1>
          <p className="mt-2 text-emerald-100">Calendario del torneo</p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-5 font-bold shadow">
            Cargando partidos...
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {matches.map((match) => (
              <div key={match.id} className="rounded-2xl bg-white p-4 shadow">
                <p className="text-sm font-black text-red-600">
                  {match.group_name}
                </p>

                <div className="mt-2">
                  <p className="text-lg font-black">{match.home_team?.name}</p>
                  <p className="text-xs text-slate-400">VS</p>
                  <p className="text-lg font-black">{match.away_team?.name}</p>
                </div>

                <div className="mt-2 text-sm text-slate-500">
                  {formatearFecha(match.match_date)} · {match.match_time} ·{" "}
                  {match.field}
                </div>

                <div className="mt-2 text-xs font-bold text-slate-400">
                  {match.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}