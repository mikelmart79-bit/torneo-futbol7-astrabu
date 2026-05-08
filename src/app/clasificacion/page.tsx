"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
};

type Match = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
};

type TableRow = {
  teamId: string;
  teamName: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

export default function ClasificacionPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [mostrarAmpliada, setMostrarAmpliada] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    setErrorCarga("");

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .order("name", { ascending: true });

    if (teamsError) {
      setErrorCarga("No se han podido cargar los equipos.");
      setLoading(false);
      return;
    }

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, home_score, away_score");

    if (matchesError) {
      setErrorCarga("No se han podido cargar los partidos.");
      setLoading(false);
      return;
    }

    setTeams((teamsData ?? []) as Team[]);
    setMatches((matchesData ?? []) as Match[]);
    setLoading(false);
  }

  const clasificacion = useMemo(() => {
    const tabla: TableRow[] = teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      pj: 0,
      g: 0,
      e: 0,
      p: 0,
      gf: 0,
      gc: 0,
      dg: 0,
      pts: 0,
    }));

    matches.forEach((match) => {
      if (match.home_score === null || match.away_score === null) return;

      const local = tabla.find((row) => row.teamId === match.home_team_id);
      const visitante = tabla.find((row) => row.teamId === match.away_team_id);

      if (!local || !visitante) return;

      local.pj += 1;
      visitante.pj += 1;

      local.gf += match.home_score;
      local.gc += match.away_score;

      visitante.gf += match.away_score;
      visitante.gc += match.home_score;

      if (match.home_score > match.away_score) {
        local.g += 1;
        visitante.p += 1;
        local.pts += 3;
      } else if (match.home_score < match.away_score) {
        visitante.g += 1;
        local.p += 1;
        visitante.pts += 3;
      } else {
        local.e += 1;
        visitante.e += 1;
        local.pts += 1;
        visitante.pts += 1;
      }

      local.dg = local.gf - local.gc;
      visitante.dg = visitante.gf - visitante.gc;
    });

    return tabla.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      if (a.gc !== b.gc) return a.gc - b.gc;
      return a.teamName.localeCompare(b.teamName);
    });
  }, [teams, matches]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-36">
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

        <Link
          href="/inicio"
          className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
        >
          Volver al inicio
        </Link>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
            Cargando clasificación...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 font-bold text-red-700 shadow-2xl">
            {errorCarga}
          </div>
        ) : clasificacion.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
            Todavía no hay equipos en la clasificación.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
            <div className="bg-red-600 px-5 py-5 text-white">
              <h2 className="text-2xl font-black">Clasificación general</h2>

              <p className="text-sm font-bold text-red-100">
                Pasan a octavos los 16 primeros
              </p>
            </div>

            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <button
                onClick={() => setMostrarAmpliada(!mostrarAmpliada)}
                className="flex w-full items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-left font-black text-white shadow"
              >
                <span>Clasificación ampliada</span>
                <span className="text-2xl leading-none">
                  {mostrarAmpliada ? "−" : "+"}
                </span>
              </button>
            </div>

            <div className="space-y-3 p-4">
              {clasificacion.map((team, index) => {
                const entraOctavos = index < 16;

                return (
                  <div
                    key={team.teamId}
                    className={`rounded-3xl border p-4 shadow-sm ${
                      entraOctavos
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl font-black text-red-600 shadow-sm">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-xl font-black leading-tight text-slate-950">
                          {team.teamName}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-2xl bg-slate-950 px-4 py-2 text-center text-white shadow">
                        <p className="text-[10px] font-black uppercase text-slate-300">
                          PTS
                        </p>

                        <p className="text-2xl font-black leading-none">
                          {team.pts}
                        </p>
                      </div>
                    </div>

                    {mostrarAmpliada && (
                      <div className="mt-4 rounded-2xl bg-white/85 px-3 py-3 shadow-sm">
                        <div className="grid grid-cols-7 gap-1 text-center">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              PJ
                            </p>
                            <p className="text-base font-black text-slate-800">
                              {team.pj}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              G
                            </p>
                            <p className="text-base font-black text-slate-800">
                              {team.g}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              E
                            </p>
                            <p className="text-base font-black text-slate-800">
                              {team.e}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              P
                            </p>
                            <p className="text-base font-black text-slate-800">
                              {team.p}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              GF
                            </p>
                            <p className="text-base font-black text-slate-800">
                              {team.gf}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              GC
                            </p>
                            <p className="text-base font-black text-slate-800">
                              {team.gc}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">
                              DG
                            </p>
                            <p className="text-base font-black text-slate-800">
                              {team.dg}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}