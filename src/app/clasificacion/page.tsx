"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string;
};

type Match = {
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  group_name: string;
};

export default function ClasificacionPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupoAbierto, setGrupoAbierto] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      const { data: teamsData } = await supabase.from("teams").select("*");
      const { data: matchesData } = await supabase.from("matches").select("*");

      setTeams(teamsData ?? []);
      setMatches(matchesData ?? []);
      setLoading(false);
    }

    cargarDatos();
  }, []);

  function calcularTabla(group: string) {
    const equiposGrupo = teams.filter((team) => team.group_name === group);

    return equiposGrupo
      .map((team) => {
        let pj = 0;
        let g = 0;
        let e = 0;
        let p = 0;
        let gf = 0;
        let gc = 0;
        let pts = 0;

        matches.forEach((match) => {
          if (match.group_name !== group) return;
          if (match.home_score === null || match.away_score === null) return;

          const esLocal = match.home_team_id === team.id;
          const esVisitante = match.away_team_id === team.id;

          if (!esLocal && !esVisitante) return;

          pj++;

          const golesFavor = esLocal ? match.home_score : match.away_score;
          const golesContra = esLocal ? match.away_score : match.home_score;

          gf += golesFavor;
          gc += golesContra;

          if (golesFavor > golesContra) {
            g++;
            pts += 3;
          } else if (golesFavor === golesContra) {
            e++;
            pts += 1;
          } else {
            p++;
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
      })
      .sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf);
  }

  const grupos = ["Grupo A", "Grupo B", "Grupo C", "Grupo D"];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-3 py-6 pb-20">
        <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-emerald-200">
            Torneo verano 2026
          </p>
          <h1 className="mt-2 text-3xl font-black">Clasificación</h1>
          <p className="mt-2 text-emerald-100">
            Los 2 primeros de cada grupo pasan a fase final.
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando clasificación...
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {grupos.map((grupo) => {
              const abierto = grupoAbierto === grupo;
              const tabla = calcularTabla(grupo);

              return (
                <div key={grupo} className="rounded-3xl bg-white/95 shadow">
                  <button
                    onClick={() => setGrupoAbierto(abierto ? "" : grupo)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div>
                      <p className="text-lg font-black">{grupo}</p>
                      <p className="text-sm text-slate-500">
                        Clasificación del grupo
                      </p>
                    </div>

                    <span className="text-2xl font-black text-red-600">
                      {abierto ? "−" : "+"}
                    </span>
                  </button>

                  {abierto && (
                    <div className="border-t border-slate-100 p-3 pt-4">
                      <div className="grid grid-cols-[1fr_22px_22px_22px_22px_24px_24px_30px_34px] gap-1 border-b border-slate-200 pb-2 text-[10px] font-black text-slate-500">
                        <span>Equipo</span>
                        <span className="text-center">PJ</span>
                        <span className="text-center">G</span>
                        <span className="text-center">E</span>
                        <span className="text-center">P</span>
                        <span className="text-center">GF</span>
                        <span className="text-center">GC</span>
                        <span className="text-center">+/-</span>
                        <span className="text-center">PTS</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {tabla.map((team, index) => {
                          const clasificado = index < 2;

                          return (
                            <div
                              key={team.id}
                              className={`grid grid-cols-[1fr_22px_22px_22px_22px_24px_24px_30px_34px] items-center gap-1 rounded-xl px-1 py-3 text-[10px] ${
                                clasificado
                                  ? "my-1 bg-emerald-50 ring-1 ring-emerald-200"
                                  : ""
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-1">
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                                    clasificado
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {index + 1}
                                </span>

                                <span
                                  className={`min-w-0 truncate leading-tight ${
                                    clasificado
                                      ? "font-black text-emerald-900"
                                      : "font-bold"
                                  }`}
                                  title={team.name}
                                >
                                  {team.name}
                                </span>
                              </div>

                              <span className="text-center font-bold">
                                {team.pj}
                              </span>
                              <span className="text-center font-bold">
                                {team.g}
                              </span>
                              <span className="text-center font-bold">
                                {team.e}
                              </span>
                              <span className="text-center font-bold">
                                {team.p}
                              </span>
                              <span className="text-center font-bold">
                                {team.gf}
                              </span>
                              <span className="text-center font-bold">
                                {team.gc}
                              </span>
                              <span
                                className={`text-center font-black ${
                                  team.dif > 0
                                    ? "text-emerald-700"
                                    : team.dif < 0
                                      ? "text-red-600"
                                      : "text-slate-600"
                                }`}
                              >
                                {team.dif > 0 ? `+${team.dif}` : team.dif}
                              </span>
                              <span className="text-center font-black text-red-600">
                                {team.pts}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        Los 2 primeros aparecen resaltados.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}