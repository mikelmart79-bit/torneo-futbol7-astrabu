"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Group = {
  id: string;
  name: string;
  sort_order: number;
};

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

export default function ClasificacionPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);
      setErrorCarga("");

      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true });

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .order("group_name", { ascending: true })
        .order("name", { ascending: true });

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(
          "home_team_id, away_team_id, home_score, away_score, group_name"
        );

      if (groupsError || teamsError || matchesError) {
        setErrorCarga("No se ha podido cargar la clasificación.");
        setLoading(false);
        return;
      }

      setGroups((groupsData ?? []) as Group[]);
      setTeams((teamsData ?? []) as Team[]);
      setMatches((matchesData ?? []) as Match[]);
      setLoading(false);
    }

    cargarDatos();
  }, []);

  const gruposClasificacion = useMemo(() => {
    const gruposDesdeTabla = groups.map((group) => ({
      id: group.id,
      name: group.name,
      sort_order: group.sort_order,
    }));

    const nombresYaIncluidos = new Set(gruposDesdeTabla.map((g) => g.name));

    const gruposDesdeEquipos = Array.from(
      new Set(
        teams
          .map((team) => team.group_name)
          .filter((group): group is string => Boolean(group))
      )
    )
      .filter((groupName) => !nombresYaIncluidos.has(groupName))
      .sort((a, b) => a.localeCompare(b))
      .map((groupName, index) => ({
        id: `extra-${groupName}`,
        name: groupName,
        sort_order: 999 + index,
      }));

    return [...gruposDesdeTabla, ...gruposDesdeEquipos].sort(
      (a, b) => a.sort_order - b.sort_order
    );
  }, [groups, teams]);

  function calcularTabla(groupName: string): TableRow[] {
    const equiposGrupo = teams.filter(
      (team) => team.group_name === groupName
    );

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
          if (match.group_name !== groupName) return;
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
      })
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dif !== a.dif) return b.dif - a.dif;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.name.localeCompare(b.name);
      });
  }

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
            Los 2 primeros de cada grupo pasan a fase final.
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
        ) : gruposClasificacion.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Todavía no hay grupos creados.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {gruposClasificacion.map((grupo) => {
              const tabla = calcularTabla(grupo.name);

              return (
                <div
                  key={grupo.id}
                  className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl"
                >
                  <div className="bg-red-600 px-5 py-4 text-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">{grupo.name}</p>
                        <p className="text-xs font-bold text-red-100">
                          Clasificación del grupo
                        </p>
                      </div>

                      <p className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">
                        {tabla.length} equipos
                      </p>
                    </div>
                  </div>

                  <div className="p-3">
                    {tabla.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                        No hay equipos en este grupo.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-[1fr_38px_42px_46px] gap-2 border-b border-slate-200 px-2 pb-2 text-xs font-black uppercase text-slate-500">
                          <span>Equipo</span>
                          <span className="text-center">PJ</span>
                          <span className="text-center">DG</span>
                          <span className="text-center">PTS</span>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {tabla.map((team, index) => {
                            const clasificado = index < 2;

                            return (
                              <div
                                key={team.id}
                                className={`grid grid-cols-[1fr_38px_42px_46px] items-center gap-2 rounded-2xl px-2 py-3 ${
                                  clasificado
                                    ? "my-1 bg-emerald-50 ring-1 ring-emerald-200"
                                    : ""
                                }`}
                              >
                                <div className="flex min-w-0 items-start gap-2">
                                  <span
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                      clasificado
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {index + 1}
                                  </span>

                                  <div className="min-w-0">
                                    <p
                                      className={`break-words text-sm leading-tight ${
                                        clasificado
                                          ? "font-black text-emerald-900"
                                          : "font-black text-slate-900"
                                      }`}
                                    >
                                      {team.name}
                                    </p>

                                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                                      G {team.g} · E {team.e} · P {team.p} · GF{" "}
                                      {team.gf} · GC {team.gc}
                                    </p>
                                  </div>
                                </div>

                                <span className="text-center text-sm font-black">
                                  {team.pj}
                                </span>

                                <span
                                  className={`text-center text-sm font-black ${
                                    team.dif > 0
                                      ? "text-emerald-700"
                                      : team.dif < 0
                                        ? "text-red-600"
                                        : "text-slate-600"
                                  }`}
                                >
                                  {team.dif > 0 ? `+${team.dif}` : team.dif}
                                </span>

                                <span className="text-center text-lg font-black text-red-600">
                                  {team.pts}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
                          Criterio de orden: puntos, diferencia de goles, goles
                          a favor y nombre del equipo.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}