"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

type Match = {
  id: string;
  tipo: "grupo" | "final";
  title?: string | null;
  phase?: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties?: number | null;
  away_penalties?: number | null;
  status: string | null;
  mvp_open: boolean | null;
  home_team: { id: string | null; name: string } | null;
  away_team: { id: string | null; name: string } | null;
};

type RawMatch = Omit<Match, "tipo" | "home_team" | "away_team"> & {
  home_team: { id: string; name: string }[] | { id: string; name: string } | null;
  away_team: { id: string; name: string }[] | { id: string; name: string } | null;
};

type FinalMatch = {
  id: string;
  phase: string;
  title: string;
  home_ref: string;
  away_ref: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: string | null;
  mvp_open: boolean | null;
  sort_order: number;
};

type Vote = {
  id: string;
  match_id: string;
  user_id: string;
  player_id: string;
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

type Seccion = "clasificacion" | "proximos" | "resultados";

function normalizarEquipo(
  equipo: RawMatch["home_team"]
): { id: string; name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function normalizarNombre(nombre: string | null | undefined) {
  return (nombre ?? "").trim().toLowerCase();
}

function getUserId() {
  let userId = localStorage.getItem("torneo_user_id");

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("torneo_user_id", userId);
  }

  return userId;
}

function fechaLocalHoy() {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, "0");
  const day = String(ahora.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function horaLocalActual() {
  const ahora = new Date();
  const hours = String(ahora.getHours()).padStart(2, "0");
  const minutes = String(ahora.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

function ordenarPartidos(partidos: Match[]) {
  return [...partidos].sort((a, b) => {
    const fechaA = a.match_date ?? "9999-12-31";
    const fechaB = b.match_date ?? "9999-12-31";

    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);

    const horaA = a.match_time ?? "99:99";
    const horaB = b.match_time ?? "99:99";

    return horaA.localeCompare(horaB);
  });
}

export default function FavoritosPage() {
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [equipoAbierto, setEquipoAbierto] = useState("");
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const guardados = localStorage.getItem("equiposFavoritos");
    const userId = getUserId();

    if (guardados) {
      try {
        setFavoritos(JSON.parse(guardados));
      } catch {
        localStorage.removeItem("equiposFavoritos");
        setFavoritos([]);
      }
    }

    async function cargarDatos() {
      setLoading(true);
      setErrorCarga("");

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

      const { data: finalData, error: finalError } = await supabase
        .from("final_matches")
        .select(`
          id,
          phase,
          title,
          home_ref,
          away_ref,
          match_date,
          match_time,
          field,
          home_score,
          away_score,
          home_penalties,
          away_penalties,
          status,
          mvp_open,
          sort_order
        `)
        .order("sort_order", { ascending: true });

      const { data: votesData, error: votesError } = await supabase
        .from("mvp_votes")
        .select("id, match_id, user_id, player_id, team_id")
        .eq("user_id", userId);

      if (teamsError || matchesError || finalError || votesError) {
        setErrorCarga("No se han podido cargar tus favoritos.");
        setLoading(false);
        return;
      }

      const partidosGrupo: Match[] = (
        (matchesData as unknown as RawMatch[]) || []
      ).map((match) => ({
        ...match,
        tipo: "grupo",
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      }));

      const partidosFinales: Match[] = ((finalData ?? []) as FinalMatch[]).map(
        (match) => ({
          id: match.id,
          tipo: "final",
          title: match.title,
          phase: match.phase,
          match_date: match.match_date,
          match_time: match.match_time,
          field: match.field,
          group_name: null,
          home_score: match.home_score,
          away_score: match.away_score,
          home_penalties: match.home_penalties,
          away_penalties: match.away_penalties,
          status: match.status,
          mvp_open: match.mvp_open,
          home_team: match.home_ref
            ? { id: null, name: match.home_ref }
            : null,
          away_team: match.away_ref
            ? { id: null, name: match.away_ref }
            : null,
        })
      );

      setTeams((teamsData ?? []) as Team[]);
      setMatches(ordenarPartidos([...partidosGrupo, ...partidosFinales]));
      setVotes((votesData ?? []) as Vote[]);
      setLoading(false);
    }

    cargarDatos();
  }, []);

  const equiposFavoritos = teams.filter((team) => favoritos.includes(team.id));

  function keySeccion(teamId: string, seccion: Seccion) {
    return `${teamId}-${seccion}`;
  }

  function seccionEstaAbierta(teamId: string, seccion: Seccion) {
    return Boolean(seccionesAbiertas[keySeccion(teamId, seccion)]);
  }

  function toggleSeccion(teamId: string, seccion: Seccion) {
    const key = keySeccion(teamId, seccion);

    setSeccionesAbiertas((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function partidoPerteneceAlEquipo(match: Match, team: Team) {
    if (match.tipo === "grupo") {
      return match.home_team?.id === team.id || match.away_team?.id === team.id;
    }

    const nombreEquipo = normalizarNombre(team.name);

    return (
      normalizarNombre(match.home_team?.name) === nombreEquipo ||
      normalizarNombre(match.away_team?.name) === nombreEquipo
    );
  }

  function partidosDelEquipo(team: Team) {
    return matches.filter((match) => partidoPerteneceAlEquipo(match, team));
  }

  function partidoEsFuturo(match: Match) {
    if (!match.match_date || !match.match_time) return true;

    const hoy = fechaLocalHoy();
    const horaActual = horaLocalActual();

    if (match.match_date > hoy) return true;
    if (match.match_date === hoy && match.match_time >= horaActual) return true;

    return false;
  }

  function proximosDelEquipo(team: Team) {
    return partidosDelEquipo(team).filter(
      (match) =>
        (match.home_score === null || match.away_score === null) &&
        partidoEsFuturo(match)
    );
  }

  function resultadosDelEquipo(team: Team) {
    return partidosDelEquipo(team).filter(
      (match) => match.home_score !== null && match.away_score !== null
    );
  }

  function clasificacionGrupo(groupName: string | null) {
    if (!groupName) return [];

    const equiposGrupo = teams.filter((team) => team.group_name === groupName);
    const partidosGrupo = matches.filter(
      (match) => match.tipo === "grupo" && match.group_name === groupName
    );

    const tabla: Row[] = equiposGrupo.map((team) => ({
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

    partidosGrupo.forEach((match) => {
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
  }

  function votoEmitido(matchId: string, teamId: string) {
    return votes.some(
      (vote) => vote.match_id === matchId && vote.team_id === teamId
    );
  }

  function quitarFavorito(teamId: string) {
    const nuevosFavoritos = favoritos.filter((id) => id !== teamId);
    setFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));

    if (equipoAbierto === teamId) {
      setEquipoAbierto("");
    }
  }

  function renderEstadoMvp(match: Match, teamId: string) {
    const yaVotado = votoEmitido(match.id, teamId);

    if (yaVotado) {
      return (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-800">
          ✅ Voto emitido
        </div>
      );
    }

    if (match.mvp_open) {
      return (
        <Link
          href={`/votar-mvp?match=${match.id}`}
          className="mt-3 block rounded-xl bg-red-600 px-3 py-2 text-center text-sm font-black text-white shadow"
        >
          Votar MVP
        </Link>
      );
    }

    return null;
  }

  function marcadorResultado(match: Match) {
    const marcador = `${match.home_score ?? "-"} - ${match.away_score ?? "-"}`;

    const hayPenaltis =
      match.home_penalties !== null &&
      match.home_penalties !== undefined &&
      match.away_penalties !== null &&
      match.away_penalties !== undefined;

    if (
      match.home_score !== null &&
      match.home_score !== undefined &&
      match.away_score !== null &&
      match.away_score !== undefined &&
      match.home_score === match.away_score &&
      hayPenaltis
    ) {
      return `${marcador} · Pen. ${match.home_penalties}-${match.away_penalties}`;
    }

    return marcador;
  }

  function renderPartido(
    match: Match,
    teamId: string,
    tipo: "proximo" | "resultado"
  ) {
    return (
      <div key={match.id} className="rounded-2xl bg-slate-50 p-4 shadow-sm">
        {match.tipo === "final" && (
          <div className="mb-3 rounded-xl bg-slate-900 px-3 py-2 text-white">
            <p className="text-xs font-black uppercase tracking-widest">
              Eliminatorias
            </p>
            <p className="mt-1 text-sm font-bold text-slate-200">
              {match.phase} · {match.title}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="break-words text-base font-black leading-tight">
              {match.home_team?.name ?? "Local"}
            </p>
            <p className="text-xs font-black uppercase text-slate-400">vs</p>
            <p className="break-words text-base font-black leading-tight">
              {match.away_team?.name ?? "Visitante"}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-slate-950 px-3 py-2 text-center text-white shadow">
            {tipo === "resultado" ? (
              <p className="whitespace-nowrap text-lg font-black">
                {marcadorResultado(match)}
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

        <p className="mt-3 text-sm font-bold text-slate-500">
          {formatearFechaSegura(match.match_date)} ·{" "}
          {match.match_time ?? "Hora pendiente"} ·{" "}
          {match.field ?? "Campo pendiente"}
        </p>

        {renderEstadoMvp(match, teamId)}
      </div>
    );
  }

  function renderClasificacion(team: Team) {
    const tabla = clasificacionGrupo(team.group_name);

    return (
      <div className="space-y-2">
        {tabla.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
            No hay clasificación disponible para este grupo.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_36px_42px_46px] gap-2 border-b border-slate-200 px-2 pb-2 text-xs font-black uppercase text-slate-500">
              <span>Equipo</span>
              <span className="text-center">PJ</span>
              <span className="text-center">DG</span>
              <span className="text-center">PTS</span>
            </div>

            {tabla.map((row, index) => {
              const clasificado = index < 2;
              const esEquipoFavorito = row.teamId === team.id;

              return (
                <div
                  key={row.teamId}
                  className={`grid grid-cols-[1fr_36px_42px_46px] items-center gap-2 rounded-2xl px-2 py-3 ${
                    esEquipoFavorito
                      ? "bg-red-50 ring-1 ring-red-200"
                      : clasificado
                        ? "bg-emerald-50 ring-1 ring-emerald-200"
                        : "bg-slate-50"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        esEquipoFavorito
                          ? "bg-red-600 text-white"
                          : clasificado
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <p className="break-words text-sm font-black leading-tight">
                        {row.team}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-slate-500">
                        G {row.g} · E {row.e} · P {row.p} · GF {row.gf} · GC{" "}
                        {row.gc}
                      </p>
                    </div>
                  </div>

                  <span className="text-center text-sm font-black">{row.pj}</span>

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
            })}
          </>
        )}
      </div>
    );
  }

  function renderBloqueInterno({
    teamId,
    seccion,
    titulo,
    color,
    children,
  }: {
    teamId: string;
    seccion: Seccion;
    titulo: string;
    color: "rojo" | "negro";
    children: ReactNode;
  }) {
    const abierta = seccionEstaAbierta(teamId, seccion);

    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <button
          onClick={() => toggleSeccion(teamId, seccion)}
          className={`flex w-full items-center justify-between px-4 py-3 text-left text-white ${
            color === "rojo" ? "bg-red-600" : "bg-slate-950"
          }`}
        >
          <p className="text-sm font-black uppercase tracking-widest">
            {titulo}
          </p>
          <span className="text-2xl font-black">{abierta ? "−" : "+"}</span>
        </button>

        {abierta && <div className="space-y-3 p-4">{children}</div>}
      </div>
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
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>
          <h1 className="mt-2 text-center text-3xl font-black">Favoritos</h1>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold text-slate-500 shadow-2xl">
            Cargando favoritos...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 font-bold text-red-700 shadow-2xl">
            {errorCarga}
          </div>
        ) : equiposFavoritos.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl">
            <p className="text-sm font-bold text-slate-500">
              Todavía no tienes equipos favoritos. Entra en Equipos y pulsa la
              estrella para seguirlos.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {equiposFavoritos.map((team) => {
              const abierto = equipoAbierto === team.id;
              const proximos = proximosDelEquipo(team);
              const resultados = resultadosDelEquipo(team);

              return (
                <div
                  key={team.id}
                  className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl"
                >
                  <button
                    onClick={() => setEquipoAbierto(abierto ? "" : team.id)}
                    className={`flex w-full items-center justify-between px-5 py-4 text-left ${
                      abierto
                        ? "bg-red-600 text-white"
                        : "bg-white/95 text-slate-900"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="break-words text-lg font-black leading-tight">
                        {team.name}
                      </p>
                      <p
                        className={`mt-1 text-sm font-bold ${
                          abierto ? "text-red-100" : "text-slate-500"
                        }`}
                      >
                        {team.group_name ?? "Sin grupo"}
                      </p>
                    </div>

                    <span className="ml-3 shrink-0 text-2xl font-black">
                      {abierto ? "−" : "+"}
                    </span>
                  </button>

                  {abierto && (
                    <div className="space-y-4 p-4">
                      <button
                        onClick={() => quitarFavorito(team.id)}
                        className="w-full rounded-xl bg-slate-900 py-3 text-sm font-black text-white shadow"
                      >
                        Quitar de favoritos
                      </button>

                      {renderBloqueInterno({
                        teamId: team.id,
                        seccion: "clasificacion",
                        titulo: "Clasificación",
                        color: "rojo",
                        children: renderClasificacion(team),
                      })}

                      {renderBloqueInterno({
                        teamId: team.id,
                        seccion: "proximos",
                        titulo: "Próximos partidos",
                        color: "negro",
                        children:
                          proximos.length === 0 ? (
                            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                              No hay próximos partidos de este equipo.
                            </p>
                          ) : (
                            proximos.map((match) =>
                              renderPartido(match, team.id, "proximo")
                            )
                          ),
                      })}

                      {renderBloqueInterno({
                        teamId: team.id,
                        seccion: "resultados",
                        titulo: "Resultados",
                        color: "rojo",
                        children:
                          resultados.length === 0 ? (
                            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                              Todavía no hay resultados de este equipo.
                            </p>
                          ) : (
                            resultados.map((match) =>
                              renderPartido(match, team.id, "resultado")
                            )
                          ),
                      })}
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