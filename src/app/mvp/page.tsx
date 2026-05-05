"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number;
};

type Vote = {
  id: string;
  player_id: string;
};

type PlayerRow = Player & {
  team_name: string;
  votes: number;
  percentage: number;
};

export default function MvpPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [idealAbierto, setIdealAbierto] = useState(false);
  const [restoAbierto, setRestoAbierto] = useState(false);

  useEffect(() => {
    async function cargarDatos() {
      const { data: playersData } = await supabase
        .from("players")
        .select("id, team_id, name, number")
        .order("number", { ascending: true });

      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name");

      const { data: votesData } = await supabase
        .from("mvp_votes")
        .select("id, player_id");

      setPlayers((playersData ?? []) as Player[]);
      setTeams((teamsData ?? []) as Team[]);
      setVotes((votesData ?? []) as Vote[]);
      setLoading(false);
    }

    cargarDatos();
  }, []);

  const totalVotes = votes.length;

  const ranking = useMemo(() => {
    const teamMap = new Map(teams.map((team) => [team.id, team.name]));

    const rows: PlayerRow[] = players.map((player) => {
      const playerVotes = votes.filter(
        (vote) => vote.player_id === player.id
      ).length;

      return {
        ...player,
        team_name: teamMap.get(player.team_id) ?? "Equipo",
        votes: playerVotes,
        percentage:
          totalVotes === 0 ? 0 : Math.round((playerVotes / totalVotes) * 100),
      };
    });

    return rows.sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.number - b.number;
    });
  }, [players, teams, votes, totalVotes]);

  const equipoIdeal = ranking.slice(0, 7);
  const restoJugadores = ranking.slice(7);

  function renderPlayer(player: PlayerRow, index: number) {
    return (
      <div
        key={player.id}
        className="rounded-2xl bg-slate-50 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
              {index + 1}
            </div>

            <div>
              <p className="font-black leading-tight">{player.name}</p>
              <p className="text-xs font-bold text-slate-500">
                #{player.number} · {player.team_name}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-black text-red-600">
              {player.votes}
            </p>
            <p className="text-xs font-bold text-slate-500">
              {player.percentage}%
            </p>
          </div>
        </div>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-600"
            style={{ width: `${player.percentage}%` }}
          />
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
          <h1 className="mt-2 text-center text-3xl font-black">
            MVP Equipo Ideal
          </h1>
        </div>

        <Link
          href="/votar-mvp"
          className="mt-6 block w-full rounded-2xl bg-red-600 py-4 text-center text-lg font-black text-white shadow-2xl"
        >
          Votar MVP
        </Link>

        <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <p className="text-sm font-black uppercase text-slate-500">
            Votos totales
          </p>
          <p className="mt-1 text-4xl font-black text-red-600">
            {totalVotes}
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando MVP...
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
              <button
                onClick={() => setIdealAbierto(!idealAbierto)}
                className="flex w-full items-center justify-between bg-red-600 px-5 py-4 text-left text-white"
              >
                <div>
                  <p className="text-lg font-black">Equipo ideal provisional</p>
                  <p className="text-sm font-bold opacity-90">
                    Los 7 jugadores más votados
                  </p>
                </div>

                <span className="text-3xl font-black">
                  {idealAbierto ? "−" : "+"}
                </span>
              </button>

              {idealAbierto && (
                <div className="space-y-3 p-4">
                  {equipoIdeal.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                      Todavía no hay votos.
                    </p>
                  ) : (
                    equipoIdeal.map((player, index) =>
                      renderPlayer(player, index)
                    )
                  )}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
              <button
                onClick={() => setRestoAbierto(!restoAbierto)}
                className="flex w-full items-center justify-between bg-slate-950 px-5 py-4 text-left text-white"
              >
                <div>
                  <p className="text-lg font-black">Resto de jugadores</p>
                  <p className="text-sm font-bold opacity-80">
                    Ordenados por votos
                  </p>
                </div>

                <span className="text-3xl font-black">
                  {restoAbierto ? "−" : "+"}
                </span>
              </button>

              {restoAbierto && (
                <div className="space-y-3 p-4">
                  {restoJugadores.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                      No hay más jugadores.
                    </p>
                  ) : (
                    restoJugadores.map((player, index) =>
                      renderPlayer(player, index + 7)
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}