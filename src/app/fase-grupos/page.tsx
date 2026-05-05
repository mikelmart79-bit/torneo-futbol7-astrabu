"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

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
  match_date: string | null;
  match_time: string | null;
  field: string | null;
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
  team_id: string | null;
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

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
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

  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    const usuario = getUserId();
    setUserId(usuario);

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

      const { data: votesData, error: votesError } = await supabase
        .from("mvp_votes")
        .select("id, match_id, user_id, team_id")
        .eq("user_id", usuario);

      if (groupsError || teamsError || matchesError || votesError) {
        setErrorCarga("No se ha podido cargar la fase de grupos.");
        setLoading(false);
        return;
      }

      const grupos = (groupsData ?? []) as Group[];
      const equipos = (teamsData ?? []) as Team[];

      const partidosNormalizados: Match[] = (
        (matchesData as unknown as RawMatch[]) || []
      ).map((match) => ({
        ...match,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      }));

      setGroups(grupos);
      setTeams(equipos);
      setMatches(partidosNormalizados);
      setVotes((votesData ?? []) as Vote[]);

      const primerGrupo =
        grupos[0]?.name ||
        equipos.find((team) => team.group_name)?.group_name ||
        partidosNormalizados.find((match) => match.group_name)?.group_name ||
        "";

      setGrupoActivo(primerGrupo);
      setLoading(false);
    }

    cargarDatos();
  }, []);

  const grupos = useMemo(() => {
    const desdeTabla = groups.map((group) => group.name);

    const desdeEquiposYPartidos = Array.from(
      new Set(
        [
          ...teams.map((team) => team.group_name),
          ...matches.map((match) => match.group_name),
        ].filter((group): group is string => Boolean(group))
      )
    ).filter((group) => !desdeTabla.includes(group));

    return [...desdeTabla, ...desdeEquiposYPartidos];
  }, [groups, teams, matches]);

  const teamsGrupo = teams.filter((team) => team.group_name === grupoActivo);

  const matchesGrupo = matches.filter(
    (match) => match.group_name === grupoActivo
  );

  function votosUsuarioEnPartido(matchId: string) {
    return votes.filter(
      (vote) => vote.match_id === matchId && vote.user_id === userId
    );
  }

  function votoCompleto(match: Match) {
    const votosPartido = votosUsuarioEnPartido(match.id);

    const votoLocal = votosPartido.some(
      (vote) => vote.team_id === match.home_team?.id
    );

    const votoVisitante = votosPartido.some(
      (vote) => vote.team_id === match.away_team?.id
    );

    return votoLocal && votoVisitante;
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
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
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

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando fase de grupos...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-2xl bg-red-100 p-5 font-bold text-red-700 shadow">
            {errorCarga}
          </div>
        ) : grupos.length === 0 ? (
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
                  <div className="grid grid-cols-[1fr_38px_42px_46px] gap-2 border-b border-slate-200 px-2 pb-2 text-xs font-black uppercase text-slate-500">
                    <span>Equipo</span>
                    <span className="text-center">PJ</span>
                    <span className="text-center">DG</span>
                    <span className="text-center">PTS</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {clasificacion.length === 0 ? (
                      <p className="p-4 text-sm font-bold text-slate-500">
                        No hay equipos en este grupo.
                      </p>
                    ) : (
                      clasificacion.map((row, index) => {
                        const clasificado = index < 2;

                        return (
                          <div
                            key={row.teamId}
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
                                  {row.team}
                                </p>

                                <p className="mt-1 text-[11px] font-bold text-slate-500">
                                  G {row.g} · E {row.e} · P {row.p} · GF{" "}
                                  {row.gf} · GC {row.gc}
                                </p>
                              </div>
                            </div>

                            <span className="text-center text-sm font-black">
                              {row.pj}
                            </span>

                            <span
                              className={`text-center text-sm font-black ${
                                row.dg > 0
                                  ? "text-emerald-700"
                                  : row.dg < 0
                                    ? "text-red-600"
                                    : "text-slate-600"
                              }`}
                            >
                              {row.dg > 0 ? `+${row.dg}` : row.dg}
                            </span>

                            <span className="text-center text-lg font-black text-red-600">
                              {row.pts}
                            </span>
                          </div>
                        );
                      })
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
                <div>
                  <p className="text-sm font-black uppercase tracking-widest">
                    Partidos del grupo
                  </p>
                  <p className="text-xs font-bold text-slate-300">
                    {matchesGrupo.length} partido
                    {matchesGrupo.length === 1 ? "" : "s"}
                  </p>
                </div>

                <span className="text-2xl font-black">
                  {partidosAbiertos ? "−" : "+"}
                </span>
              </button>

              {partidosAbiertos && (
                <div className="space-y-3 p-4">
                  {matchesGrupo.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                      No hay partidos cargados en este grupo.
                    </p>
                  ) : (
                    matchesGrupo.map((match) => {
                      const finalizado =
                        match.home_score !== null && match.away_score !== null;

                      const votoEmitido = votoCompleto(match);

                      return (
                        <div
                          key={match.id}
                          className="rounded-2xl bg-slate-50 p-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-base font-black leading-tight">
                                {match.home_team?.name}
                              </p>
                              <p className="text-xs font-black uppercase text-slate-400">
                                vs
                              </p>
                              <p className="break-words text-base font-black leading-tight">
                                {match.away_team?.name}
                              </p>
                            </div>

                            <div className="shrink-0 rounded-2xl bg-slate-950 px-3 py-2 text-center text-white shadow">
                              {finalizado ? (
                                <p className="text-2xl font-black">
                                  {match.home_score} - {match.away_score}
                                </p>
                              ) : (
                                <p className="text-lg font-black text-red-400">
                                  {match.match_time ?? "--:--"}
                                </p>
                              )}

                              <p className="text-xs font-bold text-slate-300">
                                {match.field ?? "Campo"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-500">
                            <span>
                              {formatearFechaSegura(match.match_date)} ·{" "}
                              {match.match_time ?? "Hora pendiente"} ·{" "}
                              {match.field ?? "Campo pendiente"}
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

                          {match.mvp_open && votoEmitido && (
                            <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-3 text-center text-sm font-black text-emerald-800">
                              ✅ Voto emitido
                            </div>
                          )}

                          {match.mvp_open && !votoEmitido && (
                            <Link
                              href={`/votar-mvp?match=${match.id}`}
                              className="mt-3 block rounded-xl bg-red-600 px-3 py-3 text-center text-sm font-black text-white shadow"
                            >
                              Votar MVP de este partido
                            </Link>
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