"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Match = {
  id: string;
  group_name: string;
  match_date: string;
  match_time: string;
  field: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
  home_team: { name: string }[] | { name: string } | null;
  away_team: { name: string }[] | { name: string } | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number;
};

type Vote = {
  id: string;
  match_id: string;
  player_id: string;
  user_id: string;
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

export default function MvpPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("Grupo A");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userId, setUserId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedMatch = matches.find((match) => match.id === selectedMatchId);

  const grupos = useMemo(() => {
    const encontrados = Array.from(
      new Set(matches.map((match) => match.group_name).filter(Boolean))
    );

    return encontrados.length > 0
      ? encontrados
      : ["Grupo A", "Grupo B", "Grupo C", "Grupo D"];
  }, [matches]);

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
    setUserId(getUserId());
    cargarDatos();
  }, []);

  async function cargarDatos() {
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
      console.error(matchesError);
      setLoading(false);
      return;
    }

    const partidosNormalizados: Match[] = (
      (matchesData as unknown as RawMatch[]) || []
    ).map((match) => ({
      ...match,
      home_team: normalizarEquipo(match.home_team),
      away_team: normalizarEquipo(match.away_team),
    }));

    setMatches(partidosNormalizados);

    if (partidosNormalizados.length > 0) {
      const primerGrupo = partidosNormalizados[0].group_name || "Grupo A";
      const primerPartido = partidosNormalizados.find(
        (match) => match.group_name === primerGrupo
      );

      setSelectedGroup(primerGrupo);

      if (primerPartido) {
        setSelectedMatchId(primerPartido.id);
        await cargarJugadoresYVotos(primerPartido);
      }
    }

    setLoading(false);
  }

  async function cargarJugadoresYVotos(match: Match) {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, team_id, name, number")
      .in("team_id", [match.home_team_id, match.away_team_id])
      .order("number", { ascending: true });

    const { data: votesData } = await supabase
      .from("mvp_votes")
      .select("id, match_id, player_id, user_id")
      .eq("match_id", match.id);

    setPlayers(playersData ?? []);
    setVotes(votesData ?? []);
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
        idsJugadoresEquipo.includes(vote.player_id)
    );
  }

  function totalVotosEquipo(teamId: string) {
    const idsJugadoresEquipo = players
      .filter((player) => player.team_id === teamId)
      .map((player) => player.id);

    return votes.filter((vote) => idsJugadoresEquipo.includes(vote.player_id))
      .length;
  }

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
      setMensaje(
        "No se ha podido registrar el voto. Puede que ya hayas votado en este partido."
      );
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
          <p className="text-sm font-black uppercase tracking-widest">
            {nombreEquipo}
          </p>
        </div>

        <div className="space-y-3 p-4">
          {yaVotado && (
            <div className="rounded-xl bg-emerald-100 p-3 text-sm font-bold text-emerald-800">
              Ya has votado un jugador de este equipo.
            </div>
          )}

          {jugadores.length === 0 ? (
            <p className="text-sm font-bold text-slate-500">
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
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-red-600">
                        {player.number}
                      </div>

                      <div>
                        <p className="font-black">{player.name}</p>
                        <p className="text-xs font-bold text-slate-500">
                          {votosJugador} votos · {porcentaje}%
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => votar(player)}
                      disabled={yaVotado}
                      className={`rounded-xl px-4 py-2 text-sm font-black ${
                        yaVotado
                          ? "bg-slate-300 text-slate-500"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      Votar
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
          <h1 className="mt-2 text-center text-3xl font-black">MVP</h1>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando votaciones...
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            No hay votaciones MVP abiertas.
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
              <label className="text-sm font-black uppercase text-slate-500">
                Grupo
              </label>

              <select
                value={selectedGroup}
                onChange={(event) => cambiarGrupo(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
              >
                {grupos.map((grupo) => (
                  <option key={grupo} value={grupo}>
                    {grupo}
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
                    {match.home_team?.name} vs {match.away_team?.name} ·{" "}
                    {match.match_date}
                  </option>
                ))}
              </select>

              {selectedMatch && (
                <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm font-black text-red-600">
                    {selectedMatch.group_name}
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {selectedMatch.home_team?.name} vs{" "}
                    {selectedMatch.away_team?.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedMatch.match_date} · {selectedMatch.match_time} ·{" "}
                    {selectedMatch.field}
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {selectedMatch.home_score ?? "-"} -{" "}
                    {selectedMatch.away_score ?? "-"}
                  </p>
                </div>
              )}

              {mensaje && (
                <div className="mt-4 rounded-xl bg-red-100 p-3 text-sm font-bold text-red-700">
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