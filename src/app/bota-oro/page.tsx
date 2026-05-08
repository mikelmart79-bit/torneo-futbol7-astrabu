"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PlayerType = "M" | "F";

type Goal = {
  id: string;
  player_id: string;
  team_id: string | null;
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

type RankingRow = {
  player_id: string;
  player_name: string;
  number: number | null;
  player_type: PlayerType | null;
  team_id: string;
  team_name: string;
  goals: number;
};

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

export default function BotaOroPage() {
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [jugadoresFavoritos, setJugadoresFavoritos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    setJugadoresFavoritos(leerJugadoresFavoritos());
    cargarRanking();
  }, []);

  async function cargarRanking() {
    setLoading(true);
    setMensaje("");

    const { data: goalsData, error: goalsError } = await supabase
      .from("match_goals")
      .select("id, player_id, team_id");

    if (goalsError) {
      console.error("Error cargando goles:", goalsError);
      setMensaje("No se ha podido cargar la clasificación de goleadores.");
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

    const goals = (goalsData ?? []) as Goal[];
    const players = (playersData ?? []) as Player[];
    const teams = (teamsData ?? []) as Team[];

    const contador: Record<string, RankingRow> = {};

    goals.forEach((goal) => {
      const player = players.find((item) => item.id === goal.player_id);
      if (!player) return;

      const teamId = goal.team_id ?? player.team_id;
      const team = teams.find((item) => item.id === teamId);

      if (!contador[goal.player_id]) {
        contador[goal.player_id] = {
          player_id: goal.player_id,
          player_name: player.name,
          number: player.number,
          player_type: player.player_type,
          team_id: teamId,
          team_name: team?.name ?? "Equipo",
          goals: 0,
        };
      }

      contador[goal.player_id].goals += 1;
    });

    const rankingFinal = Object.values(contador).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (a.team_name !== b.team_name) return a.team_name.localeCompare(b.team_name);
      return a.player_name.localeCompare(b.player_name);
    });

    setRanking(rankingFinal);
    setLoading(false);
  }

  function posicion(index: number) {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}.`;
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
            Bota de Oro
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Ranking de máximos goleadores
          </p>
        </div>

        <Link
          href="/inicio"
          className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
        >
          Volver al inicio
        </Link>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
            Cargando Bota de Oro...
          </div>
        ) : mensaje ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 text-sm font-bold text-red-700 shadow-2xl">
            {mensaje}
          </div>
        ) : ranking.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl">
            <p className="text-sm font-bold text-slate-500">
              Todavía no hay goles registrados en las fichas de partido.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {ranking.map((row, index) => {
              const esPrimero = index === 0;
              const tipo = row.player_type === "F" ? "F" : "M";
              const esJugadorFavorito = jugadoresFavoritos.includes(
                row.player_id
              );

              return (
                <div
                  key={row.player_id}
                  className={`rounded-3xl p-4 shadow-2xl ${
                    esPrimero
                      ? "bg-red-600 text-white"
                      : "bg-white/95 text-slate-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${
                        esPrimero
                          ? "bg-white text-red-600"
                          : "bg-slate-950 text-white"
                      }`}
                    >
                      {posicion(index)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-lg font-black leading-tight">
                        {row.number !== null
                          ? `${row.number} · ${row.player_name}`
                          : row.player_name}
                      </p>

                      <p
                        className={`mt-1 text-sm font-bold ${
                          esPrimero ? "text-red-100" : "text-slate-500"
                        }`}
                      >
                        {row.team_name}
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
                          onClick={() => toggleJugadorFavorito(row.player_id)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-lg font-black shadow ${
                            esJugadorFavorito
                              ? "bg-yellow-300 text-slate-950"
                              : esPrimero
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                          aria-label={
                            esJugadorFavorito
                              ? "Quitar jugador de favoritos"
                              : "Añadir jugador a favoritos"
                          }
                        >
                          {esJugadorFavorito ? "★" : "☆"}
                        </button>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-4xl font-black leading-none">
                        {row.goals}
                      </p>

                      <p
                        className={`text-xs font-black uppercase ${
                          esPrimero ? "text-red-100" : "text-slate-500"
                        }`}
                      >
                        goles
                      </p>
                    </div>
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