"use client";

import { useEffect, useState } from "react";
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
  home_team: { name: string };
  away_team: { name: string };
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
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userId, setUserId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedMatch = matches.find((match) => match.id === selectedMatchId);
  const userVote = votes.find(
    (vote) => vote.match_id === selectedMatchId && vote.user_id === userId
  );

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
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      console.error(matchesError);
      setLoading(false);
      return;
    }

    const partidos = (matchesData ?? []) as unknown as Match[];
    setMatches(partidos);

    if (partidos.length > 0) {
      setSelectedMatchId(partidos[0].id);
      await cargarJugadoresYVotos(partidos[0]);
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

  async function votar(playerId: string) {
    if (!selectedMatch) return;

    const { error } = await supabase.from("mvp_votes").insert({
      match_id: selectedMatch.id,
      player_id: playerId,
      user_id: userId,
    });

    if (error) {
      setMensaje("Ya has votado en este partido.");
      return;
    }

    setMensaje("Voto registrado correctamente.");
    await cargarJugadoresYVotos(selectedMatch);
  }

  const totalVotos = votes.length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-20">
        <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-emerald-200">
            Torneo verano 2026
          </p>
          <h1 className="mt-2 text-3xl font-black">MVP</h1>
          <p className="mt-2 text-emerald-100">
            Vota al mejor jugador del partido.
          </p>
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
                Partido
              </label>

              <select
                value={selectedMatchId}
                onChange={(event) => cambiarPartido(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
              >
                {matches.map((match) => (
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
            </div>

            <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
              <h2 className="text-xl font-black">Candidatos MVP</h2>

              {userVote && (
                <div className="mt-3 rounded-xl bg-emerald-100 p-3 text-sm font-bold text-emerald-800">
                  Ya has votado en este partido.
                </div>
              )}

              {mensaje && (
                <div className="mt-3 rounded-xl bg-red-100 p-3 text-sm font-bold text-red-700">
                  {mensaje}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {players.map((player) => {
                  const votosJugador = contarVotos(player.id);
                  const porcentaje =
                    totalVotos === 0
                      ? 0
                      : Math.round((votosJugador / totalVotos) * 100);

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
                          onClick={() => votar(player.id)}
                          disabled={Boolean(userVote)}
                          className={`rounded-xl px-4 py-2 text-sm font-black ${
                            userVote
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
                })}
              </div>

              <p className="mt-4 text-xs font-semibold text-slate-500">
                Modo demo: ahora el voto se controla por navegador. Luego lo
                vincularemos a usuario registrado.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}