"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PlayerType = "M" | "F" | "-";

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

function crearStatsVacias(): PlayerStats {
  return {
    played: 0,
    goals: 0,
    yellow: 0,
    red: 0,
    suspensions: 0,
  };
}

function tipoJugador(tipo: PlayerType | null) {
  if (tipo === "M" || tipo === "F") return tipo;
  return "-";
}

function claseTipoJugador(tipo: PlayerType | null) {
  const limpio = tipoJugador(tipo);

  if (limpio === "F") return "bg-emerald-100 text-emerald-700";
  if (limpio === "M") return "bg-slate-200 text-slate-700";
  return "bg-white text-slate-500";
}

export default function JugadorDetallePage() {
  const params = useParams();
  const idParam = params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<PlayerStats>(crearStatsVacias());
  const [jugadoresFavoritos, setJugadoresFavoritos] = useState<string[]>([]);
  const [equiposFavoritos, setEquiposFavoritos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
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

    const equiposGuardados = localStorage.getItem("equiposFavoritos");

    if (equiposGuardados) {
      try {
        const ids = JSON.parse(equiposGuardados);
        setEquiposFavoritos(Array.isArray(ids) ? ids : []);
      } catch {
        localStorage.removeItem("equiposFavoritos");
        setEquiposFavoritos([]);
      }
    }

    async function cargarJugador() {
      if (!id) {
        setErrorCarga("Jugador no encontrado.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorCarga("");

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id, team_id, name, number, player_type")
        .eq("id", id)
        .single();

      if (playerError || !playerData) {
        setErrorCarga("No se ha podido cargar el jugador.");
        setLoading(false);
        return;
      }

      const jugador = playerData as Player;
      setPlayer(jugador);

      const [teamResult, playedResult, goalsResult, cardsResult, suspensionsResult] =
        await Promise.all([
          supabase.from("teams").select("id, name").eq("id", jugador.team_id).single(),
          supabase.from("match_players").select("id, player_id").eq("player_id", jugador.id),
          supabase.from("match_goals").select("id, player_id").eq("player_id", jugador.id),
          supabase
            .from("match_cards")
            .select("id, player_id, card_type")
            .eq("player_id", jugador.id),
          supabase
            .from("suspensions")
            .select("id, player_id, status")
            .eq("player_id", jugador.id),
        ]);

      if (!teamResult.error && teamResult.data) {
        setTeam(teamResult.data as Team);
      }

      const nextStats = crearStatsVacias();

      ((playedResult.data ?? []) as MatchPlayerRow[]).forEach(() => {
        nextStats.played += 1;
      });

      ((goalsResult.data ?? []) as GoalRow[]).forEach(() => {
        nextStats.goals += 1;
      });

      ((cardsResult.data ?? []) as CardRow[]).forEach((row) => {
        if (row.card_type === "yellow") {
          nextStats.yellow += 1;
        }

        if (row.card_type === "red") {
          nextStats.red += 1;
        }
      });

      ((suspensionsResult.data ?? []) as SuspensionRow[]).forEach(() => {
        nextStats.suspensions += 1;
      });

      setStats(nextStats);
      setLoading(false);
    }

    cargarJugador();
  }, [id]);

  function toggleJugadorFavorito() {
    if (!player) return;

    const nuevosFavoritos = jugadoresFavoritos.includes(player.id)
      ? jugadoresFavoritos.filter((item) => item !== player.id)
      : [...jugadoresFavoritos, player.id];

    setJugadoresFavoritos(nuevosFavoritos);
    localStorage.setItem(
      "jugadoresFavoritos",
      JSON.stringify(nuevosFavoritos),
    );
  }

  function toggleEquipoFavorito() {
    if (!player) return;

    const nuevosFavoritos = equiposFavoritos.includes(player.team_id)
      ? equiposFavoritos.filter((item) => item !== player.team_id)
      : [...equiposFavoritos, player.team_id];

    setEquiposFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));
  }

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />

        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-white/95 p-5 font-bold shadow">
            Cargando jugador...
          </div>
        </section>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />

        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-white/95 p-5 shadow">
            <p className="font-bold">
              {errorCarga || "Jugador no encontrado."}
            </p>

            <Link
              href="/jugadores/buscar"
              className="mt-4 inline-block font-black text-red-600"
            >
              ← Volver al buscador
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const jugadorFavorito = jugadoresFavoritos.includes(player.id);
  const equipoFavorito = equiposFavoritos.includes(player.team_id);
  const tipo = tipoJugador(player.player_type);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
        <Link
          href="/jugadores/buscar"
          className="mb-4 block rounded-2xl bg-white/95 px-4 py-3 text-center text-sm font-black text-slate-900 shadow"
        >
          ← Volver al buscador
        </Link>

        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>

          <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-3xl font-black text-white shadow-2xl">
            {player.number ?? "-"}
          </div>

          <h1 className="mt-4 break-words text-center text-3xl font-black leading-tight">
            {player.name}
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            {team?.name ?? "Equipo"}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={toggleJugadorFavorito}
            className={`rounded-2xl py-4 text-center text-sm font-black shadow-2xl ${
              jugadorFavorito
                ? "bg-yellow-300 text-slate-950"
                : "bg-white/95 text-slate-900"
            }`}
          >
            {jugadorFavorito ? "★ Jugador favorito" : "☆ Favorito jugador"}
          </button>

          <button
            onClick={toggleEquipoFavorito}
            className={`rounded-2xl py-4 text-center text-sm font-black shadow-2xl ${
              equipoFavorito
                ? "bg-red-600 text-white"
                : "bg-white/95 text-slate-900"
            }`}
          >
            {equipoFavorito ? "★ Equipo favorito" : "☆ Favorito equipo"}
          </button>
        </div>

        <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <h2 className="text-xl font-black">Datos del jugador</h2>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <p className="text-xs font-black uppercase text-slate-500">
                Dorsal
              </p>

              <p className="mt-1 text-2xl font-black text-red-600">
                {player.number ?? "-"}
              </p>
            </div>

            <div
              className={`rounded-2xl p-4 text-center shadow ${claseTipoJugador(
                player.player_type,
              )}`}
            >
              <p className="text-xs font-black uppercase">Tipo</p>

              <p className="mt-1 text-2xl font-black">{tipo}</p>
            </div>

            <Link
              href={`/equipos/${player.team_id}`}
              className="rounded-2xl bg-slate-950 p-4 text-center text-white shadow"
            >
              <p className="text-xs font-black uppercase">Equipo</p>

              <p className="mt-1 text-sm font-black leading-tight">
                Ver equipo
              </p>
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <h2 className="text-xl font-black">Estadísticas</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <p className="text-xs font-black uppercase text-slate-500">
                Jugados
              </p>

              <p className="mt-1 text-3xl font-black text-slate-950">
                {stats.played}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <p className="text-xs font-black uppercase text-slate-500">
                Goles
              </p>

              <p className="mt-1 text-3xl font-black text-red-600">
                {stats.goals}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <p className="text-xs font-black uppercase text-slate-500">
                Amarillas
              </p>

              <p className="mt-1 text-3xl font-black text-yellow-500">
                {stats.yellow}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <p className="text-xs font-black uppercase text-slate-500">
                Rojas
              </p>

              <p className="mt-1 text-3xl font-black text-red-700">
                {stats.red}
              </p>
            </div>

            <div className="col-span-2 rounded-2xl bg-slate-50 p-4 text-center shadow">
              <p className="text-xs font-black uppercase text-slate-500">
                Sanciones
              </p>

              <p className="mt-1 text-3xl font-black text-slate-950">
                {stats.suspensions}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}