"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PlayerType = "M" | "F" | "-";

type Team = {
  id: string;
  name: string;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  player_type: PlayerType | null;
};

function normalizar(texto: string | null | undefined) {
  return (texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

export default function BuscarJugadorPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [busqueda, setBusqueda] = useState("");
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

    async function cargarDatos() {
      setLoading(true);
      setErrorCarga("");

      const [playersResult, teamsResult] = await Promise.all([
        supabase
          .from("players")
          .select("id, team_id, name, number, player_type")
          .order("number", { ascending: true })
          .order("name", { ascending: true }),
        supabase.from("teams").select("id, name").order("name"),
      ]);

      if (playersResult.error) {
        setErrorCarga("No se han podido cargar los jugadores.");
        setLoading(false);
        return;
      }

      if (teamsResult.error) {
        setErrorCarga("No se han podido cargar los equipos.");
        setLoading(false);
        return;
      }

      setPlayers((playersResult.data ?? []) as Player[]);
      setTeams((teamsResult.data ?? []) as Team[]);
      setLoading(false);
    }

    cargarDatos();
  }, []);

  const teamsById = useMemo(() => {
    const map = new Map<string, Team>();

    teams.forEach((team) => {
      map.set(team.id, team);
    });

    return map;
  }, [teams]);

  const resultados = useMemo(() => {
    const texto = normalizar(busqueda);

    if (!texto) return players;

    return players.filter((player) => {
      const team = teamsById.get(player.team_id);

      const nombre = normalizar(player.name);
      const equipo = normalizar(team?.name);
      const dorsal = player.number?.toString() ?? "";

      return (
        nombre.includes(texto) ||
        equipo.includes(texto) ||
        dorsal.includes(texto)
      );
    });
  }, [busqueda, players, teamsById]);

  function toggleJugadorFavorito(playerId: string) {
    const nuevosFavoritos = jugadoresFavoritos.includes(playerId)
      ? jugadoresFavoritos.filter((id) => id !== playerId)
      : [...jugadoresFavoritos, playerId];

    setJugadoresFavoritos(nuevosFavoritos);
    localStorage.setItem(
      "jugadoresFavoritos",
      JSON.stringify(nuevosFavoritos),
    );
  }

  function toggleEquipoFavorito(teamId: string) {
    const nuevosFavoritos = equiposFavoritos.includes(teamId)
      ? equiposFavoritos.filter((id) => id !== teamId)
      : [...equiposFavoritos, teamId];

    setEquiposFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
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

          <h1 className="mt-2 text-center text-3xl font-black">
            Buscar jugador
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Busca por nombre, dorsal o equipo
          </p>
        </div>

        <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <label className="text-sm font-black uppercase text-slate-500">
            Nombre del jugador
          </label>

          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Ejemplo: Adrián, 10, Colombia..."
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-base font-bold outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
          />

          <p className="mt-3 text-xs font-bold text-slate-500">
            Resultados: {resultados.length}
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando jugadores...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-2xl bg-red-100 p-5 font-bold text-red-700 shadow">
            {errorCarga}
          </div>
        ) : resultados.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold text-slate-500 shadow">
            No se han encontrado jugadores.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {resultados.map((player) => {
              const team = teamsById.get(player.team_id);
              const jugadorFav = jugadoresFavoritos.includes(player.id);
              const equipoFav = equiposFavoritos.includes(player.team_id);
              const tipo = tipoJugador(player.player_type);

              return (
                <div
                  key={player.id}
                  className="rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-red-600 text-2xl font-black text-white shadow">
                      {player.number ?? "-"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-xl font-black leading-tight text-slate-950">
                        {player.name}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {team?.name ?? "Equipo"}
                      </p>
                    </div>

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black shadow ${claseTipoJugador(
                        player.player_type,
                      )}`}
                    >
                      {tipo}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Link
                      href={`/jugadores/${player.id}`}
                      className="rounded-xl bg-red-600 py-3 text-center text-sm font-black text-white shadow"
                    >
                      Ver jugador
                    </Link>

                    <Link
                      href={`/equipos/${player.team_id}`}
                      className="rounded-xl bg-slate-950 py-3 text-center text-sm font-black text-white shadow"
                    >
                      Ver equipo
                    </Link>

                    <button
                      onClick={() => toggleJugadorFavorito(player.id)}
                      className={`rounded-xl py-3 text-sm font-black shadow ${
                        jugadorFav
                          ? "bg-yellow-300 text-slate-950"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {jugadorFav ? "★ Jugador favorito" : "☆ Favorito jugador"}
                    </button>

                    <button
                      onClick={() => toggleEquipoFavorito(player.team_id)}
                      className={`rounded-xl py-3 text-sm font-black shadow ${
                        equipoFav
                          ? "bg-red-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {equipoFav ? "★ Equipo favorito" : "☆ Favorito equipo"}
                    </button>
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