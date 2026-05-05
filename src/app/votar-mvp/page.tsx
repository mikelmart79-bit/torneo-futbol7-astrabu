"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Team = {
  id: string;
  name: string;
};

type Match = {
  id: string;
  tipo: "grupo" | "final";
  group_name: string;
  phase?: string;
  title?: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type RawMatch = Omit<Match, "tipo" | "home_team" | "away_team"> & {
  home_team: { name: string }[] | { name: string } | null;
  away_team: { name: string }[] | { name: string } | null;
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
  mvp_open: boolean | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
};

type Vote = {
  id: string;
  match_id: string;
  player_id: string;
  user_id: string;
  team_id: string | null;
};

function normalizarEquipo(
  equipo: RawMatch["home_team"]
): { name: string } | null {
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

function buscarEquipoPorNombre(nombre: string, equipos: Team[]) {
  const limpio = nombre.trim().toLowerCase();

  return equipos.find((team) => team.name.trim().toLowerCase() === limpio);
}

export default function VotarMvpPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userId, setUserId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const selectedMatch = matches.find((match) => match.id === selectedMatchId);

  const matchesGrupo = matches.filter(
    (match) => match.group_name === selectedGroup
  );

  const jugadoresLocal = selectedMatch
    ? players.filter((player) => player.team_id === selectedMatch.home_team_id)
    : [];

  const jugadoresVisitante = selectedMatch
    ? players.filter((player) => player.team_id === selectedMatch.away_team_id)
    : [];

  useEffect(() => {
    const currentUserId = getUserId();
    setUserId(currentUserId);
    cargarDatos();
  }, []);

  const gruposConPartidos = useMemo(() => {
    const nombres = Array.from(
      new Set(matches.map((match) => match.group_name))
    );

    return nombres.map((name, index) => ({
      id: name || String(index),
      name,
      sort_order: index + 1,
    }));
  }, [matches]);

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

    const equipos = (teamsData ?? []) as Team[];

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select(
        `
        id,
        group_name,
        match_date,
        match_time,
        field,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `
      )
      .eq("mvp_open", true)
      .order("group_name", { ascending: true })
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      setErrorCarga("No se han podido cargar las votaciones.");
      setLoading(false);
      return;
    }

    const partidosGrupo: Match[] = (
      (matchesData as unknown as RawMatch[]) || []
    ).map((match) => ({
      ...match,
      tipo: "grupo" as const,
      group_name: match.group_name || "Fase de grupos",
      home_team: normalizarEquipo(match.home_team),
      away_team: normalizarEquipo(match.away_team),
    }));

    const { data: finalData, error: finalError } = await supabase
      .from("final_matches")
      .select(
        "id, phase, title, home_ref, away_ref, match_date, match_time, field, home_score, away_score, mvp_open"
      )
      .eq("mvp_open", true)
      .order("sort_order", { ascending: true });

    if (finalError) {
      setErrorCarga("No se han podido cargar las eliminatorias MVP.");
      setLoading(false);
      return;
    }

    const eliminatorias = ((finalData ?? []) as FinalMatch[])
      .map((match): Match | null => {
        const local = buscarEquipoPorNombre(match.home_ref, equipos);
        const visitante = buscarEquipoPorNombre(match.away_ref, equipos);

        if (!local || !visitante) return null;

        return {
          id: match.id,
          tipo: "final" as const,
          group_name: "Eliminatorias",
          phase: match.phase,
          title: match.title,
          match_date: match.match_date,
          match_time: match.match_time,
          field: match.field,
          home_team_id: local.id,
          away_team_id: visitante.id,
          home_score: match.home_score,
          away_score: match.away_score,
          home_team: { name: local.name },
          away_team: { name: visitante.name },
        };
      })
      .filter((match): match is Match => match !== null);

    const todosPartidos = [...partidosGrupo, ...eliminatorias];

    setMatches(todosPartidos);

    if (todosPartidos.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const matchParam = params.get("match");

      const partidoUrl = matchParam
        ? todosPartidos.find((match) => match.id === matchParam)
        : null;

      const partidoInicial = partidoUrl ?? todosPartidos[0];

      setSelectedGroup(partidoInicial.group_name);
      setSelectedMatchId(partidoInicial.id);
      await cargarJugadoresYVotos(partidoInicial);
    }

    setLoading(false);
  }

  async function cargarJugadoresYVotos(match: Match) {
    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, team_id, name, number")
      .in("team_id", [match.home_team_id, match.away_team_id])
      .order("number", { ascending: true });

    const { data: votesData, error: votesError } = await supabase
      .from("mvp_votes")
      .select("id, match_id, player_id, user_id, team_id")
      .eq("match_id", match.id);

    if (playersError || votesError) {
      setMensaje("No se han podido cargar jugadores o votos.");
      return;
    }

    setPlayers((playersData ?? []) as Player[]);
    setVotes((votesData ?? []) as Vote[]);
    setMensaje("");
  }

  async function cambiarGrupo(grupo: string) {
    setSelectedGroup(grupo);

    const primerPartidoGrupo = matches.find(
      (match) => match.group_name === grupo
    );

    if (primerPartidoGrupo) {
      setSelectedMatchId(primerPartidoGrupo.id);
      await cargarJugadoresYVotos(primerPartidoGrupo);
    } else {
      setSelectedMatchId("");
      setPlayers([]);
      setVotes([]);
    }
  }

  async function cambiarPartido(id: string) {
    setSelectedMatchId(id);

    const match = matches.find((item) => item.id === id);

    if (match) {
      await cargarJugadoresYVotos(match);
    }
  }

  function contarVotos(playerId: string) {
    return votes.filter((vote) => vote.player_id === playerId).length;
  }

  function usuarioYaVotoEquipo(teamId: string) {
    const jugadoresEquipo = players.filter((player) => player.team_id === teamId);
    const idsJugadoresEquipo = jugadoresEquipo.map((player) => player.id);

    return votes.some(
      (vote) =>
        vote.match_id === selectedMatchId &&
        vote.user_id === userId &&
        (vote.team_id === teamId || idsJugadoresEquipo.includes(vote.player_id))
    );
  }

  function totalVotosEquipo(teamId: string) {
    const idsJugadoresEquipo = players
      .filter((player) => player.team_id === teamId)
      .map((player) => player.id);

    return votes.filter(
      (vote) => vote.team_id === teamId || idsJugadoresEquipo.includes(vote.player_id)
    ).length;
  }

  const yaVotoLocal = selectedMatch
    ? usuarioYaVotoEquipo(selectedMatch.home_team_id)
    : false;

  const yaVotoVisitante = selectedMatch
    ? usuarioYaVotoEquipo(selectedMatch.away_team_id)
    : false;

  const votoPartidoCompleto = yaVotoLocal && yaVotoVisitante;

  async function votar(player: Player) {
    if (!selectedMatch) return;

    if (usuarioYaVotoEquipo(player.team_id)) {
      setMensaje("Ya has votado un jugador de este equipo en este partido.");
      return;
    }

    const { error } = await supabase.from("mvp_votes").insert({
      match_id: selectedMatch.id,
      player_id: player.id,
      user_id: userId,
      team_id: player.team_id,
    });

    if (error) {
      if (error.code === "23505") {
        setMensaje("Ya has votado a este equipo en este partido.");
      } else {
        setMensaje("Error al registrar el voto.");
      }
      return;
    }

    setMensaje("Voto registrado correctamente.");
    await cargarJugadoresYVotos(selectedMatch);
  }

  function renderEquipo(nombreEquipo: string, teamId: string, jugadores: Player[]) {
    const totalEquipo = totalVotosEquipo(teamId);
    const yaVotado = usuarioYaVotoEquipo(teamId);

    return (
      <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
        <div className="bg-red-600 px-5 py-3 text-white">
          <p className="break-words text-sm font-black uppercase tracking-widest">
            {nombreEquipo}
          </p>
        </div>

        <div className="space-y-3 p-4">
          {yaVotado && (
            <div className="rounded-xl bg-emerald-100 p-3 text-sm font-black text-emerald-800">
              ✅ Voto emitido para este equipo.
            </div>
          )}

          {jugadores.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
              No hay jugadores cargados para este equipo.
            </p>
          ) : (
            jugadores.map((player) => {
              const votosJugador = contarVotos(player.id);
              const porcentaje =
                totalEquipo === 0
                  ? 0
                  : Math.round((votosJugador / totalEquipo) * 100);

              return (
                <div
                  key={player.id}
                  className="rounded-2xl bg-slate-50 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-red-600">
                        {player.number ?? "-"}
                      </div>

                      <div className="min-w-0">
                        <p className="break-words font-black leading-tight">
                          {player.name}
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          {votosJugador} votos · {porcentaje}%
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => votar(player)}
                      disabled={yaVotado}
                      className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black ${
                        yaVotado
                          ? "bg-slate-300 text-slate-500"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {yaVotado ? "Votado" : "Votar"}
                    </button>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
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
          <h1 className="mt-2 text-center text-3xl font-black">Votar MVP</h1>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando votaciones...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-2xl bg-red-100 p-5 font-bold text-red-700 shadow">
            {errorCarga}
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            No hay votaciones MVP abiertas.
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
              {votoPartidoCompleto && (
                <div className="mb-4 rounded-xl bg-emerald-100 p-3 text-sm font-black text-emerald-800">
                  ✅ Voto emitido en este partido.
                </div>
              )}

              <label className="text-sm font-black uppercase text-slate-500">
                Fase / grupo
              </label>

              <select
                value={selectedGroup}
                onChange={(event) => cambiarGrupo(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
              >
                {gruposConPartidos.map((grupo) => (
                  <option key={grupo.id} value={grupo.name}>
                    {grupo.name}
                  </option>
                ))}
              </select>

              <label className="mt-4 block text-sm font-black uppercase text-slate-500">
                Partido
              </label>

              <select
                value={selectedMatchId}
                onChange={(event) => cambiarPartido(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
              >
                {matchesGrupo.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.tipo === "final" ? `${match.phase} · ` : ""}
                    {match.home_team?.name} vs {match.away_team?.name} ·{" "}
                    {match.match_date
                      ? formatearFecha(match.match_date)
                      : "Fecha pendiente"}
                  </option>
                ))}
              </select>

              {selectedMatch && (
                <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm font-black text-red-600">
                    {selectedMatch.tipo === "final"
                      ? `${selectedMatch.phase} · ${selectedMatch.title}`
                      : selectedMatch.group_name}
                  </p>
                  <h2 className="mt-1 break-words text-xl font-black leading-tight">
                    {selectedMatch.home_team?.name} vs{" "}
                    {selectedMatch.away_team?.name}
                  </h2>
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    {selectedMatch.match_date
                      ? formatearFecha(selectedMatch.match_date)
                      : "Fecha pendiente"}{" "}
                    · {selectedMatch.match_time ?? "Hora pendiente"} ·{" "}
                    {selectedMatch.field ?? "Campo pendiente"}
                  </p>
                  <p className="mt-3 text-2xl font-black">
                    {selectedMatch.home_score ?? "-"} -{" "}
                    {selectedMatch.away_score ?? "-"}
                  </p>
                </div>
              )}

              {mensaje && (
                <div
                  className={`mt-4 rounded-xl p-3 text-sm font-bold ${
                    mensaje.includes("correctamente")
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {mensaje}
                </div>
              )}
            </div>

            {selectedMatch && (
              <div className="mt-6 space-y-5">
                {renderEquipo(
                  selectedMatch.home_team?.name ?? "Equipo local",
                  selectedMatch.home_team_id,
                  jugadoresLocal
                )}

                {renderEquipo(
                  selectedMatch.away_team?.name ?? "Equipo visitante",
                  selectedMatch.away_team_id,
                  jugadoresVisitante
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}