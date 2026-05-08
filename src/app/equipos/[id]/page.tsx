"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PlayerType = "M" | "F";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
  home_color: string | null;
  away_color: string | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  player_type: PlayerType | null;
};

type MatchPlayerRow = {
  id: string;
  player_id: string;
};

type GoalRow = {
  id: string;
  player_id: string;
};

type CardRow = {
  id: string;
  player_id: string;
  card_type: "yellow" | "red";
};

type SuspensionRow = {
  id: string;
  player_id: string;
  status: string | null;
};

type PlayerStats = {
  played: number;
  goals: number;
  yellow: number;
  red: number;
  suspensions: number;
};

function ShirtIcon({ color }: { color: string }) {
  return (
    <div className="relative h-10 w-11">
      <div
        className="absolute left-2 top-1 h-9 w-7 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute left-0 top-2 h-4 w-4 -rotate-12 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute right-0 top-2 h-4 w-4 rotate-12 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function crearStatsVacias(): PlayerStats {
  return {
    played: 0,
    goals: 0,
    yellow: 0,
    red: 0,
    suspensions: 0,
  };
}

export default function EquipoDetalle() {
  const params = useParams();
  const idParam = params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [equipo, setEquipo] = useState<Team | null>(null);
  const [jugadores, setJugadores] = useState<Player[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [jugadoresFavoritos, setJugadoresFavoritos] = useState<string[]>([]);
  const [jugadoresAbiertos, setJugadoresAbiertos] = useState<string[]>([]);
  const [estadisticas, setEstadisticas] = useState<Record<string, PlayerStats>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    const equiposGuardados = localStorage.getItem("equiposFavoritos");

    if (equiposGuardados) {
      try {
        setFavoritos(JSON.parse(equiposGuardados));
      } catch {
        localStorage.removeItem("equiposFavoritos");
        setFavoritos([]);
      }
    }

    const jugadoresGuardados = localStorage.getItem("jugadoresFavoritos");

    if (jugadoresGuardados) {
      try {
        const ids = JSON.parse(jugadoresGuardados);
        setJugadoresFavoritos(Array.isArray(ids) ? ids : []);
      } catch {
        localStorage.removeItem("jugadoresFavoritos");
        setJugadoresFavoritos([]);
      }
    }

    async function cargarEquipo() {
      if (!id) {
        setEquipo(null);
        setErrorCarga("Equipo no encontrado.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorCarga("");

      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id, name, group_name, home_color, away_color")
        .eq("id", id)
        .single();

      if (teamError || !teamData) {
        setEquipo(null);
        setErrorCarga("No se ha podido cargar el equipo.");
        setLoading(false);
        return;
      }

      setEquipo(teamData as Team);

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, team_id, name, number, player_type")
        .eq("team_id", id)
        .order("number", { ascending: true })
        .order("name", { ascending: true });

      if (playersError) {
        setErrorCarga("No se ha podido cargar la plantilla.");
        setLoading(false);
        return;
      }

      const plantilla = (playersData ?? []) as Player[];
      setJugadores(plantilla);

      await cargarEstadisticasJugadores(plantilla);

      setLoading(false);
    }

    cargarEquipo();
  }, [id]);

  async function cargarEstadisticasJugadores(plantilla: Player[]) {
    const playerIds = plantilla.map((player) => player.id);

    if (playerIds.length === 0) {
      setEstadisticas({});
      return;
    }

    const statsBase: Record<string, PlayerStats> = {};

    playerIds.forEach((playerId) => {
      statsBase[playerId] = crearStatsVacias();
    });

    const [playedResult, goalsResult, cardsResult, suspensionsResult] =
      await Promise.all([
        supabase
          .from("match_players")
          .select("id, player_id")
          .in("player_id", playerIds),
        supabase
          .from("match_goals")
          .select("id, player_id")
          .in("player_id", playerIds),
        supabase
          .from("match_cards")
          .select("id, player_id, card_type")
          .in("player_id", playerIds),
        supabase
          .from("suspensions")
          .select("id, player_id, status")
          .in("player_id", playerIds),
      ]);

    if (playedResult.error) {
      console.error("Error cargando partidos jugados:", playedResult.error);
    }

    if (goalsResult.error) {
      console.error("Error cargando goles:", goalsResult.error);
    }

    if (cardsResult.error) {
      console.error("Error cargando tarjetas:", cardsResult.error);
    }

    if (suspensionsResult.error) {
      console.error("Error cargando sanciones:", suspensionsResult.error);
    }

    ((playedResult.data ?? []) as MatchPlayerRow[]).forEach((row) => {
      if (!statsBase[row.player_id]) return;
      statsBase[row.player_id].played += 1;
    });

    ((goalsResult.data ?? []) as GoalRow[]).forEach((row) => {
      if (!statsBase[row.player_id]) return;
      statsBase[row.player_id].goals += 1;
    });

    ((cardsResult.data ?? []) as CardRow[]).forEach((row) => {
      if (!statsBase[row.player_id]) return;

      if (row.card_type === "yellow") {
        statsBase[row.player_id].yellow += 1;
      }

      if (row.card_type === "red") {
        statsBase[row.player_id].red += 1;
      }
    });

    ((suspensionsResult.data ?? []) as SuspensionRow[]).forEach((row) => {
      if (!statsBase[row.player_id]) return;
      statsBase[row.player_id].suspensions += 1;
    });

    setEstadisticas(statsBase);
  }

  function toggleFavorito() {
    if (!equipo) return;

    const nuevosFavoritos = favoritos.includes(equipo.id)
      ? favoritos.filter((item) => item !== equipo.id)
      : [...favoritos, equipo.id];

    setFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));
  }

  function toggleJugadorFavorito(playerId: string) {
    const nuevosFavoritos = jugadoresFavoritos.includes(playerId)
      ? jugadoresFavoritos.filter((item) => item !== playerId)
      : [...jugadoresFavoritos, playerId];

    setJugadoresFavoritos(nuevosFavoritos);
    localStorage.setItem(
      "jugadoresFavoritos",
      JSON.stringify(nuevosFavoritos)
    );
  }

  function toggleJugadorAbierto(playerId: string) {
    setJugadoresAbiertos((actuales) =>
      actuales.includes(playerId)
        ? actuales.filter((item) => item !== playerId)
        : [...actuales, playerId]
    );
  }

  function statsJugador(playerId: string) {
    return estadisticas[playerId] ?? crearStatsVacias();
  }

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />

        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-white/95 p-5 font-bold shadow">
            Cargando equipo...
          </div>
        </section>
      </main>
    );
  }

  if (!equipo) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />

        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-white/95 p-5 shadow">
            <p className="font-bold">
              {errorCarga || "Equipo no encontrado."}
            </p>

            <Link
              href="/equipos"
              className="mt-4 inline-block font-black text-red-600"
            >
              ← Volver a equipos
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const colorLocal = equipo.home_color || "#047857";
  const colorVisitante = equipo.away_color || "#dc2626";
  const esFavorito = favoritos.includes(equipo.id);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
        <Link
          href="/equipos"
          className="mb-4 block rounded-2xl bg-white/95 px-4 py-3 text-center text-sm font-black text-slate-900 shadow"
        >
          ← Volver a equipos
        </Link>

        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>

          <h1 className="mt-2 break-words text-center text-3xl font-black leading-tight">
            {equipo.name}
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Equipo participante
          </p>
        </div>

        <button
          onClick={toggleFavorito}
          className={`mt-5 w-full rounded-2xl py-4 text-center text-base font-black shadow-2xl ${
            esFavorito
              ? "bg-red-600 text-white"
              : "bg-white/95 text-slate-900"
          }`}
        >
          {esFavorito ? "★ Equipo favorito" : "☆ Añadir a favoritos"}
        </button>

        <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <h2 className="text-xl font-black">Equipaciones</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <div className="flex justify-center">
                <ShirtIcon color={colorLocal} />
              </div>

              <p className="mt-2 text-sm font-black text-slate-700">Local</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <div className="flex justify-center">
                <ShirtIcon color={colorVisitante} />
              </div>

              <p className="mt-2 text-sm font-black text-slate-700">
                Visitante
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Plantilla</h2>

            <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
              {jugadores.length}
            </p>
          </div>

          {jugadores.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
              Este equipo todavía no tiene jugadores añadidos.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {jugadores.map((player) => {
                const tipo = player.player_type === "F" ? "F" : "M";
                const esJugadorFavorito = jugadoresFavoritos.includes(
                  player.id
                );
                const abierto = jugadoresAbiertos.includes(player.id);
                const stats = statsJugador(player.id);

                return (
                  <div
                    key={player.id}
                    className="rounded-2xl bg-slate-50 p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white">
                        {player.number ?? "-"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-lg font-black leading-tight">
                          {player.name}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleJugadorAbierto(player.id)}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-black shadow ${
                          abierto
                            ? "bg-red-600 text-white"
                            : "bg-white text-slate-600"
                        }`}
                        aria-label={
                          abierto
                            ? "Ocultar estadísticas del jugador"
                            : "Ver estadísticas del jugador"
                        }
                      >
                        {abierto ? "−" : "+"}
                      </button>

                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black shadow ${
                          tipo === "F"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {tipo}
                      </div>

                      <button
                        onClick={() => toggleJugadorFavorito(player.id)}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-black shadow ${
                          esJugadorFavorito
                            ? "bg-yellow-300 text-slate-950"
                            : "bg-white text-slate-400"
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

                    {abierto && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Jugados
                          </p>
                          <p className="mt-1 text-2xl font-black text-slate-950">
                            {stats.played}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Goles
                          </p>
                          <p className="mt-1 text-2xl font-black text-red-600">
                            {stats.goals}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Amarillas
                          </p>
                          <p className="mt-1 text-2xl font-black text-yellow-500">
                            {stats.yellow}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Rojas
                          </p>
                          <p className="mt-1 text-2xl font-black text-red-700">
                            {stats.red}
                          </p>
                        </div>

                        <div className="col-span-2 rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Sanciones
                          </p>
                          <p className="mt-1 text-2xl font-black text-slate-950">
                            {stats.suspensions}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}