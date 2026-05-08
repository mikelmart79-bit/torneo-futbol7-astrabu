"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type PlayerType = "M" | "F";

type Suspension = {
  id: string;
  player_id: string;
  team_id: string;
  match_id: string | null;
  final_match_id: string | null;
  reason: string;
  games: number;
  served: number;
  status: string;
  created_at: string | null;
};

type SuspensionServedMatch = {
  id: string;
  suspension_id: string;
  match_id: string | null;
  final_match_id: string | null;
  created_at: string | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  player_type: PlayerType | null;
};

type Team = {
  id: string;
  name: string;
};

type TeamRef = {
  name: string;
};

type Match = {
  id: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_team_id: string;
  away_team_id: string;
  home_team: TeamRef | null;
  away_team: TeamRef | null;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
  home_team: TeamRef[] | TeamRef | null;
  away_team: TeamRef[] | TeamRef | null;
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
};

type SuspensionMatch = {
  id: string;
  tipo: "grupo" | "final";
  phase: string;
  title: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_name: string;
  away_name: string;
  dateValue: number;
  sanctionGameNumber: number;
};

type SuspensionRow = {
  id: string;
  playerId: string;
  playerName: string;
  playerNumber: number | null;
  playerType: PlayerType | null;
  teamId: string;
  teamName: string;
  reason: string;
  games: number;
  served: number;
  status: string;
  origin: string;
  originDateValue: number;
  unavailableMatches: SuspensionMatch[];
};

function normalizarEquipo(equipo: RawMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function estadoPendiente(status: string) {
  const estado = normalizarTexto(status);

  return (
    estado !== "cumplida" &&
    estado !== "completada" &&
    estado !== "served" &&
    estado !== "completed"
  );
}

function fechaPartidoValor(fecha: string | null, hora: string | null) {
  if (!fecha) return Number.POSITIVE_INFINITY;

  const [year, month, day] = fecha.split("-").map(Number);
  const [hour, minute] = (hora ?? "23:59").split(":").map(Number);

  return new Date(year, month - 1, day, hour || 0, minute || 0).getTime();
}

function fechaCreacionValor(createdAt: string | null) {
  if (!createdAt) return Date.now();

  const value = new Date(createdAt).getTime();

  return Number.isNaN(value) ? Date.now() : value;
}

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

function leerJugadoresFavoritos() {
  try {
    const guardados = localStorage.getItem("jugadoresFavoritos");
    const ids = guardados ? JSON.parse(guardados) : [];

    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    localStorage.removeItem("jugadoresFavoritos");
    return [];
  }
}

function partidoGrupoToSuspensionMatch(match: Match): Omit<SuspensionMatch, "sanctionGameNumber"> {
  return {
    id: match.id,
    tipo: "grupo",
    phase: "Clasificación",
    title: "Clasificación",
    match_date: match.match_date,
    match_time: match.match_time,
    field: match.field,
    home_name: match.home_team?.name ?? "Local",
    away_name: match.away_team?.name ?? "Visitante",
    dateValue: fechaPartidoValor(match.match_date, match.match_time),
  };
}

function partidoFinalToSuspensionMatch(
  match: FinalMatch
): Omit<SuspensionMatch, "sanctionGameNumber"> {
  return {
    id: match.id,
    tipo: "final",
    phase: match.phase,
    title: match.title,
    match_date: match.match_date,
    match_time: match.match_time,
    field: match.field,
    home_name: match.home_ref || "Local",
    away_name: match.away_ref || "Visitante",
    dateValue: fechaPartidoValor(match.match_date, match.match_time),
  };
}

function ordenarPartidosSancion(
  matches: Array<Omit<SuspensionMatch, "sanctionGameNumber">>
) {
  return [...matches].sort((a, b) => {
    if (a.dateValue !== b.dateValue) return a.dateValue - b.dateValue;
    return a.title.localeCompare(b.title);
  });
}

export default function SancionadosPage() {
  const [rows, setRows] = useState<SuspensionRow[]>([]);
  const [jugadoresFavoritos, setJugadoresFavoritos] = useState<string[]>([]);
  const [filtro, setFiltro] = useState<"pendientes" | "todas">("pendientes");
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    setJugadoresFavoritos(leerJugadoresFavoritos());
    cargarSancionados();
  }, []);

  async function cargarSancionados() {
    setLoading(true);
    setMensaje("");

    const { data: suspensionsData, error: suspensionsError } = await supabase
      .from("suspensions")
      .select(
        "id, player_id, team_id, match_id, final_match_id, reason, games, served, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (suspensionsError) {
      console.error("Error cargando sanciones:", suspensionsError);
      setMensaje("No se han podido cargar los sancionados.");
      setLoading(false);
      return;
    }

    const { data: servedData, error: servedError } = await supabase
      .from("suspension_served_matches")
      .select("id, suspension_id, match_id, final_match_id, created_at")
      .order("created_at", { ascending: true });

    if (servedError) {
      console.error("Error cargando partidos de sanción cumplidos:", servedError);
      setMensaje("No se han podido cargar los partidos de sanción cumplidos.");
      setLoading(false);
      return;
    }

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, team_id, name, number, player_type");

    if (playersError) {
      console.error("Error cargando jugadores:", playersError);
      setMensaje("No se han podido cargar los jugadores.");
      setLoading(false);
      return;
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name");

    if (teamsError) {
      console.error("Error cargando equipos:", teamsError);
      setMensaje("No se han podido cargar los equipos.");
      setLoading(false);
      return;
    }

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select(
        `
        id,
        match_date,
        match_time,
        field,
        home_team_id,
        away_team_id,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `
      )
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      console.error("Error cargando partidos:", matchesError);
    }

    const { data: finalMatchesData, error: finalMatchesError } = await supabase
      .from("final_matches")
      .select("id, phase, title, home_ref, away_ref, match_date, match_time, field")
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (finalMatchesError) {
      console.error("Error cargando eliminatorias:", finalMatchesError);
    }

    const suspensions = (suspensionsData ?? []) as Suspension[];
    const servedMatches = (servedData ?? []) as SuspensionServedMatch[];
    const players = (playersData ?? []) as Player[];
    const teams = (teamsData ?? []) as Team[];

    const matches: Match[] = ((matchesData as unknown as RawMatch[]) || []).map(
      (match) => ({
        ...match,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      })
    );

    const finalMatches = (finalMatchesData ?? []) as FinalMatch[];

    const rowsFinales: SuspensionRow[] = suspensions.map((suspension) => {
      const player = players.find((item) => item.id === suspension.player_id);
      const team = teams.find((item) => item.id === suspension.team_id);

      const teamName = team?.name ?? "Equipo";
      const teamNameNorm = normalizarTexto(teamName);

      const partidosCumplidosRegistrados = servedMatches.filter(
        (item) => item.suspension_id === suspension.id
      ).length;

      const servedReal = Math.min(
        Math.max(suspension.served ?? 0, partidosCumplidosRegistrados),
        suspension.games
      );

      const restantes = Math.max(suspension.games - servedReal, 0);
      const statusReal = restantes <= 0 ? "Cumplida" : "Activa";

      let origin = "Partido no identificado";
      let originDateValue = fechaCreacionValor(suspension.created_at);

      if (suspension.match_id) {
        const match = matches.find((item) => item.id === suspension.match_id);

        if (match) {
          const fecha = match.match_date
            ? formatearFecha(match.match_date)
            : "Fecha pendiente";

          origin = `${match.home_team?.name ?? "Local"} vs ${
            match.away_team?.name ?? "Visitante"
          } · ${fecha}`;

          originDateValue = fechaPartidoValor(
            match.match_date,
            match.match_time
          );
        }
      }

      if (suspension.final_match_id) {
        const finalMatch = finalMatches.find(
          (item) => item.id === suspension.final_match_id
        );

        if (finalMatch) {
          const fecha = finalMatch.match_date
            ? formatearFecha(finalMatch.match_date)
            : "Fecha pendiente";

          origin = `${finalMatch.phase} · ${finalMatch.title} · ${
            finalMatch.home_ref
          } vs ${finalMatch.away_ref} · ${fecha}`;

          originDateValue = fechaPartidoValor(
            finalMatch.match_date,
            finalMatch.match_time
          );
        }
      }

      const partidosGrupo = matches
        .filter(
          (match) =>
            match.home_team_id === suspension.team_id ||
            match.away_team_id === suspension.team_id
        )
        .map(partidoGrupoToSuspensionMatch);

      const partidosFinales = finalMatches
        .filter(
          (match) =>
            normalizarTexto(match.home_ref) === teamNameNorm ||
            normalizarTexto(match.away_ref) === teamNameNorm
        )
        .map(partidoFinalToSuspensionMatch);

      const partidosOrdenados = ordenarPartidosSancion([
        ...partidosGrupo,
        ...partidosFinales,
      ]).filter((match) => match.dateValue > originDateValue);

      const unavailableMatches = partidosOrdenados
        .slice(servedReal, suspension.games)
        .map((match, index) => ({
          ...match,
          sanctionGameNumber: servedReal + index + 1,
        }));

      return {
        id: suspension.id,
        playerId: suspension.player_id,
        playerName: player?.name ?? "Jugador",
        playerNumber: player?.number ?? null,
        playerType: player?.player_type ?? null,
        teamId: suspension.team_id,
        teamName,
        reason: suspension.reason,
        games: suspension.games,
        served: servedReal,
        status: statusReal,
        origin,
        originDateValue,
        unavailableMatches,
      };
    });

    rowsFinales.sort((a, b) => {
      const aPendiente = estadoPendiente(a.status);
      const bPendiente = estadoPendiente(b.status);

      if (aPendiente !== bPendiente) return aPendiente ? -1 : 1;

      if (a.teamName !== b.teamName) return a.teamName.localeCompare(b.teamName);

      return a.playerName.localeCompare(b.playerName);
    });

    setRows(rowsFinales);
    setLoading(false);
  }

  function toggleJugadorFavorito(playerId: string) {
    const nuevosFavoritos = jugadoresFavoritos.includes(playerId)
      ? jugadoresFavoritos.filter((id) => id !== playerId)
      : [...jugadoresFavoritos, playerId];

    setJugadoresFavoritos(nuevosFavoritos);
    localStorage.setItem(
      "jugadoresFavoritos",
      JSON.stringify(nuevosFavoritos)
    );
  }

  const pendientes = rows.filter((row) => estadoPendiente(row.status));
  const rowsMostrar = filtro === "pendientes" ? pendientes : rows;

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
            Sancionados
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Jugadores con sanción activa o ya cumplida
          </p>
        </div>

        <Link
          href="/inicio"
          className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
        >
          Volver al inicio
        </Link>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setFiltro("pendientes")}
            className={`rounded-2xl px-4 py-3 text-sm font-black shadow ${
              filtro === "pendientes"
                ? "bg-red-600 text-white"
                : "bg-white/95 text-slate-900"
            }`}
          >
            Activas
          </button>

          <button
            onClick={() => setFiltro("todas")}
            className={`rounded-2xl px-4 py-3 text-sm font-black shadow ${
              filtro === "todas"
                ? "bg-red-600 text-white"
                : "bg-white/95 text-slate-900"
            }`}
          >
            Todas
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
            Cargando sancionados...
          </div>
        ) : mensaje ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 text-sm font-bold text-red-700 shadow-2xl">
            {mensaje}
          </div>
        ) : rowsMostrar.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl">
            <p className="text-sm font-bold text-slate-500">
              {filtro === "pendientes"
                ? "No hay jugadores sancionados activos."
                : "Todavía no hay sanciones registradas."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {rowsMostrar.map((row) => {
              const pendiente = estadoPendiente(row.status);
              const restantes = Math.max(row.games - row.served, 0);
              const tipo = row.playerType === "F" ? "F" : "M";
              const esFavorito = jugadoresFavoritos.includes(row.playerId);

              return (
                <div
                  key={row.id}
                  className={`rounded-3xl p-4 shadow-2xl ${
                    pendiente
                      ? "bg-white/95 text-slate-900"
                      : "bg-slate-200/95 text-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white">
                      {row.playerNumber ?? "-"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-xl font-black leading-tight">
                        {row.playerName}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {row.teamName}
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black shadow ${
                            tipo === "F"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {tipo}
                        </span>

                        <button
                          onClick={() => toggleJugadorFavorito(row.playerId)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-lg font-black shadow ${
                            esFavorito
                              ? "bg-yellow-300 text-slate-950"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {esFavorito ? "★" : "☆"}
                        </button>
                      </div>
                    </div>

                    <div
                      className={`shrink-0 rounded-2xl px-3 py-2 text-center text-xs font-black uppercase ${
                        pendiente
                          ? "bg-red-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {pendiente ? "Activa" : "Cumplida"}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm font-black text-slate-900">
                      {row.reason}
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-600">
                      Sanción: {row.games} partido
                      {row.games === 1 ? "" : "s"}
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-600">
                      Cumplidos: {row.served} de {row.games} · Restan:{" "}
                      {restantes}
                    </p>
                  </div>

                  {pendiente && restantes > 0 && (
                    <div className="mt-4 rounded-2xl bg-red-50 p-4">
                      <p className="text-sm font-black uppercase tracking-widest text-red-700">
                        No puede jugar
                      </p>

                      {row.unavailableMatches.length === 0 ? (
                        <p className="mt-2 text-sm font-bold text-red-700">
                          Calendario pendiente o sin próximos partidos
                          asignados.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {row.unavailableMatches.map((match) => (
                            <div
                              key={`${match.tipo}-${match.id}`}
                              className="rounded-xl bg-white p-3 shadow-sm"
                            >
                              <p className="text-xs font-black uppercase text-red-600">
                                Partido {match.sanctionGameNumber} de{" "}
                                {row.games} de sanción
                              </p>

                              <p className="mt-1 text-xs font-black uppercase text-slate-500">
                                {match.tipo === "final"
                                  ? `${match.phase} · ${match.title}`
                                  : "Clasificación"}
                              </p>

                              <p className="mt-1 text-sm font-black text-slate-950">
                                {match.home_name} vs {match.away_name}
                              </p>

                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {formatearFechaSegura(match.match_date)} ·{" "}
                                {match.match_time ?? "Hora pendiente"} ·{" "}
                                {match.field ?? "Campo pendiente"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="mt-3 text-xs font-bold text-slate-500">
                    Origen: {row.origin}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}