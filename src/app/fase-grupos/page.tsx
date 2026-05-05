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
  id: string;
  match_date: string;
  match_time: string;
  field: string;
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  mvp_open: boolean | null;
  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
  home_team: { id: string; name: string }[] | { id: string; name: string } | null;
  away_team: { id: string; name: string }[] | { id: string; name: string } | null;
};

type Vote = {
  id: string;
  match_id: string;
  user_id: string;
};

type Row = {
  teamId: string;
  team: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

function normalizarEquipo(
  equipo: RawMatch["home_team"]
): { id: string; name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function getUserId() {
  let userId = localStorage.getItem("torneo_user_id");

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("torneo_user_id", userId);
  }

  return userId;
}

export default function FaseGruposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [grupoActivo, setGrupoActivo] = useState("");
  const [clasificacionAbierta, setClasificacionAbierta] = useState(false);
  const [partidosAbiertos, setPartidosAbiertos] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const usuario = getUserId();
    setUserId(usuario);

    async function cargarDatos() {
      const { data: groupsData } = await supabase
        .from("groups")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true });

      const grupos = (groupsData ?? []) as Group[];
      setGroups(grupos);

      if (grupos.length > 0) {
        setGrupoActivo(grupos[0].name);
      }

      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .order("group_name", { ascending: true })
        .order("name", { ascending: true });

      const { data: matchesData } = await supabase
        .from("matches")
        .select(`
          id,
          match_date,
          match_time,
          field,
          group_name,
          home_score,
          away_score,
          status,
          mvp_open,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true });

      const { data: votesData } = await supabase
        .from("mvp_votes")
        .select("id, match_id, user_id")
        .eq("user_id", usuario);

      const partidosNormalizados: Match[] = (
        (matchesData as unknown as RawMatch[]) || []
      ).map((match) => ({
        ...match,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      }));

      setTeams((teamsData as Team[]) || []);
      setMatches(partidosNormalizados);
      setVotes((votesData ?? []) as Vote[]);
    }

    cargarDatos();
  }, []);

  const grupos = useMemo(() => groups.map((group) => group.name), [groups]);

  const teamsGrupo = teams.filter((team) => team.group_name === grupoActivo);

  const matchesGrupo = matches.filter(
    (match) => match.group_name === grupoActivo
  );

  function votosUsuarioEnPartido(matchId: string) {
    return votes.filter(
      (vote) => vote.match_id === matchId && vote.user_id === userId
    ).length;
  }

  const clasificacion = useMemo(() => {
    const tabla: Row[] = teamsGrupo.map((team) => ({
      teamId: team.id,
      team: team.name,
      pj: 0,
      g: 0,
      e: 0,
      p: 0,
      gf: 0,
      gc: 0,
      dg: 0,
      pts: 0,
    }));

    matchesGrupo.forEach((match) => {
      if (
        match.home_score === null ||
        match.away_score === null ||
        !match.home_team ||
        !match.away_team
      ) {
        return;
      }

      const local = tabla.find((row) => row.teamId === match.home_team?.id);
      const visitante = tabla.find((row) => row.teamId === match.away_team?.id);

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
      return b.gf - a.gf;
    });
  }, [teamsGrupo, matchesGrupo]);

  useEffect(() => {
    setClasificacionAbierta(false);
    setPartidosAbiertos(false);
  }, [grupoActivo]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>
          <h1 className="mt-2 text-center text-3xl font-black">
            Fase de grupos
          </h1>
        </div>

        {grupos.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Todavía no hay grupos creados.
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {grupos.map((grupo) => (
                <button
                  key={grupo}
                  onClick={() => setGrupoActivo(grupo)}
                  className={`rounded-2xl px-4 py-4 text-sm font-black shadow ${
                    grupoActivo === grupo
                      ? "bg-red-600 text-white"
                      : "bg-white/95 text-slate-800"
                  }`}
                >
                  {grupo}
                </button>
              ))}
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
              <button
                onClick={() => setClasificacionAbierta(!clasificacionAbierta)}
                className="flex w-full items-center justify-between bg-red-600 px-5 py-4 text-left text-white"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">
                    Clasificación
                  </p>
                  <p className="text-sm font-bold">{grupoActivo}</p>
                </div>

                <span className="text-2xl font-black">
                  {clasificacionAbierta ? "−" : "+"}
                </span>
              </button>

              {clasificacionAbierta && (
                <div className="p-3">
                  <div className="grid grid-cols-[1fr_28px_28px_28px_28px_42px_40px] border-b border-slate-200 pb-2 text-[11px] font-black text-slate-500">
                    <span>Equipo</span>
                    <span className="text-center">PJ</span>
                    <span className="text-center">G</span>
                    <span className="text-center">E</span>
                    <span className="text-center">P</span>
                    <span className="text-center">+/-</span>
                    <span className="text-center">PTS</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {clasificacion.map((row, index) => {
                      const clasificado = index < 2;

                      return (
                        <div
                          key={row.teamId}
                          className={`grid grid-cols-[1fr_28px_28px_28px_28px_42px_40px] items-center rounded-xl py-3 text-xs ${
                            clasificado
                              ? "my-1 bg-emerald-50 ring-1 ring-emerald-200"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                clasificado
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {index + 1}
                            </span>
                            <span className="font-black leading-tight">
                              {row.team}
                            </span>
                          </div>

                          <span className="text-center font-bold">
                            {row.pj}
                          </span>
                          <span className="text-center font-bold">
                            {row.g}
                          </span>
                          <span className="text-center font-bold">
                            {row.e}
                          </span>
                          <span className="text-center font-bold">
                            {row.p}
                          </span>
                          <span
                            className={`text-center font-black ${
                              row.dg > 0
                                ? "text-emerald-700"
                                : row.dg < 0
                                ? "text-red-600"
                                : "text-slate-600"
                            }`}
                          >
                            {row.dg > 0 ? `+${row.dg}` : row.dg}
                          </span>
                          <span className="text-center font-black text-red-600">
                            {row.pts}
                          </span>
                        </div>
                      );
                    })}

                    {clasificacion.length === 0 && (
                      <p className="p-4 text-sm font-bold text-slate-500">
                        No hay equipos en este grupo.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
              <button
                onClick={() => setPartidosAbiertos(!partidosAbiertos)}
                className="flex w-full items-center justify-between bg-slate-950 px-5 py-4 text-left text-white"
              >
                <p className="text-sm font-black uppercase tracking-widest">
                  Partidos del grupo
                </p>

                <span className="text-2xl font-black">
                  {partidosAbiertos ? "−" : "+"}
                </span>
              </button>

              {partidosAbiertos && (
                <div className="space-y-3 p-4">
                  {matchesGrupo.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No hay partidos cargados en este grupo.
                    </p>
                  ) : (
                    matchesGrupo.map((match) => {
                      const finalizado =
                        match.home_score !== null && match.away_score !== null;

                      const votosEmitidos = votosUsuarioEnPartido(match.id);
                      const votoCompleto = votosEmitidos >= 2;

                      return (
                        <div
                          key={match.id}
                          className="rounded-2xl bg-white p-4 shadow"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-base font-black leading-tight">
                                {match.home_team?.name}
                              </p>
                              <p className="text-xs font-black uppercase text-slate-400">
                                vs
                              </p>
                              <p className="text-base font-black leading-tight">
                                {match.away_team?.name}
                              </p>
                            </div>

                            <div className="min-w-20 rounded-2xl bg-slate-950 px-3 py-2 text-center text-white shadow">
                              {finalizado ? (
                                <p className="text-2xl font-black">
                                  {match.home_score} - {match.away_score}
                                </p>
                              ) : (
                                <p className="text-lg font-black text-red-400">
                                  {match.match_time}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-sm font-semibold text-slate-500">
                            <span>
                              {match.match_date} · {match.match_time} ·{" "}
                              {match.field}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                finalizado
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {finalizado ? "Finalizado" : "Pendiente"}
                            </span>
                          </div>

                          {match.mvp_open && votoCompleto && (
                            <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-3 text-center text-sm font-black text-emerald-800">
                              ✅ Voto emitido
                            </div>
                          )}

                          {match.mvp_open && !votoCompleto && (
                            <a
                              href={`/votar-mvp?match=${match.id}`}
                              className="mt-3 block rounded-xl bg-red-600 px-3 py-3 text-center text-sm font-black text-white shadow"
                            >
                              Votar MVP de este partido
                            </a>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}