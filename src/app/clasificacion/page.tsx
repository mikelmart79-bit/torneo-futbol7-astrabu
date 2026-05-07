"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

type Match = {
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  group_name: string | null;
};

type TableRow = {
  id: string;
  name: string;
  group_name: string | null;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dif: number;
  pts: number;
};

const CLASIFICADOS_OCTAVOS = 16;

export default function ClasificacionPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);
      setErrorCarga("");

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .order("name", { ascending: true });

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(
          "home_team_id, away_team_id, home_score, away_score, group_name"
        );

      if (teamsError || matchesError) {
        setErrorCarga("No se ha podido cargar la clasificación.");
        setLoading(false);
        return;
      }

      setTeams((teamsData ?? []) as Team[]);
      setMatches((matchesData ?? []) as Match[]);
      setLoading(false);
    }

    cargarDatos();
  }, []);

  const tablaGeneral = useMemo(() => {
    const tabla: TableRow[] = teams.map((team) => {
      let pj = 0;
      let g = 0;
      let e = 0;
      let p = 0;
      let gf = 0;
      let gc = 0;
      let pts = 0;

      matches.forEach((match) => {
        if (match.home_score === null || match.away_score === null) return;

        const esLocal = match.home_team_id === team.id;
        const esVisitante = match.away_team_id === team.id;

        if (!esLocal && !esVisitante) return;

        pj += 1;

        const golesFavor = esLocal ? match.home_score : match.away_score;
        const golesContra = esLocal ? match.away_score : match.home_score;

        gf += golesFavor;
        gc += golesContra;

        if (golesFavor > golesContra) {
          g += 1;
          pts += 3;
        } else if (golesFavor === golesContra) {
          e += 1;
          pts += 1;
        } else {
          p += 1;
        }
      });

      return {
        ...team,
        pj,
        g,
        e,
        p,
        gf,
        gc,
        dif: gf - gc,
        pts,
      };
    });

    return tabla.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dif !== a.dif) return b.dif - a.dif;
      if (b.gf !== a.gf) return b.gf - a.gf;
      if (a.gc !== b.gc) return a.gc - b.gc;
      return a.name.localeCompare(b.name);
    });
  }, [teams, matches]);

  const clasificados = tablaGeneral.slice(0, CLASIFICADOS_OCTAVOS);
  const resto = tablaGeneral.slice(CLASIFICADOS_OCTAVOS);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-3 py-6 pb-24">
        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>

          <h1 className="mt-2 text-center text-3xl font-black">
            Clasificación
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Clasificación general. Los 16 primeros pasan a octavos.
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando clasificación...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-2xl bg-red-100 p-5 font-bold text-red-700 shadow">
            {errorCarga}
          </div>
        ) : tablaGeneral.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Todavía no hay equipos creados.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl">
              <div className="bg-red-600 px-5 py-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black">
                      Clasificación general
                    </p>
                    <p className="text-xs font-bold text-red-100">
                      Pasan a octavos los 16 primeros
                    </p>
                  </div>

                  <p className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">
                    {tablaGeneral.length} equipos
                  </p>
                </div>
              </div>

              <div className="p-3">
                <div className="mb-2 grid grid-cols-[34px_1fr_38px_38px_46px] gap-2 px-2 text-[11px] font-black uppercase text-slate-400">
                  <p>#</p>
                  <p>Equipo</p>
                  <p className="text-center">PJ</p>
                  <p className="text-center">DG</p>
                  <p className="text-center">PTS</p>
                </div>

                <div className="space-y-2">
                  {tablaGeneral.map((team, index) => {
                    const posicion = index + 1;
                    const clasificado = posicion <= CLASIFICADOS_OCTAVOS;

                    return (
                      <div
                        key={team.id}
                        className={`rounded-2xl p-3 shadow-sm ${
                          clasificado
                            ? "bg-red-50 ring-2 ring-red-200"
                            : "bg-slate-50"
                        }`}
                      >
                        <div className="grid grid-cols-[34px_1fr_38px_38px_46px] items-center gap-2">
                          <p
                            className={`text-center text-sm font-black ${
                              clasificado ? "text-red-600" : "text-slate-500"
                            }`}
                          >
                            {posicion}
                          </p>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">
                              {team.name}
                            </p>

                            {clasificado ? (
                              <p className="mt-0.5 text-[11px] font-black uppercase text-red-600">
                                Octavos
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[11px] font-bold uppercase text-slate-400">
                                No clasificado
                              </p>
                            )}
                          </div>

                          <p className="text-center text-sm font-black">
                            {team.pj}
                          </p>

                          <p
                            className={`text-center text-sm font-black ${
                              team.dif > 0
                                ? "text-emerald-600"
                                : team.dif < 0
                                ? "text-red-600"
                                : "text-slate-700"
                            }`}
                          >
                            {team.dif > 0 ? `+${team.dif}` : team.dif}
                          </p>

                          <p className="text-center text-lg font-black text-slate-950">
                            {team.pts}
                          </p>
                        </div>

                        <div className="mt-3 grid grid-cols-6 rounded-xl bg-white px-2 py-2 text-center text-[11px] font-bold text-slate-600">
                          <div>
                            <p className="font-black text-slate-400">G</p>
                            <p>{team.g}</p>
                          </div>

                          <div>
                            <p className="font-black text-slate-400">E</p>
                            <p>{team.e}</p>
                          </div>

                          <div>
                            <p className="font-black text-slate-400">P</p>
                            <p>{team.p}</p>
                          </div>

                          <div>
                            <p className="font-black text-slate-400">GF</p>
                            <p>{team.gf}</p>
                          </div>

                          <div>
                            <p className="font-black text-slate-400">GC</p>
                            <p>{team.gc}</p>
                          </div>

                          <div>
                            <p className="font-black text-slate-400">DG</p>
                            <p>{team.dif > 0 ? `+${team.dif}` : team.dif}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-black/70 p-5 text-white shadow-2xl backdrop-blur">
              <p className="text-sm font-black uppercase tracking-widest text-emerald-100">
                Resumen
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4 text-center">
                  <p className="text-3xl font-black">{clasificados.length}</p>
                  <p className="text-xs font-black uppercase text-emerald-100">
                    En octavos
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 text-center">
                  <p className="text-3xl font-black">{resto.length}</p>
                  <p className="text-xs font-black uppercase text-emerald-100">
                    Fuera
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}