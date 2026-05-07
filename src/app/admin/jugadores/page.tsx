"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type PlayerType = "M" | "F";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number;
  player_type: PlayerType | null;
};

export default function AdminJugadoresPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");

  const [nombre, setNombre] = useState("");
  const [dorsal, setDorsal] = useState("");
  const [tipoJugador, setTipoJugador] = useState<PlayerType>("M");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const jugadoresEquipo = players.filter((player) => player.team_id === teamId);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos(mantenerTeamId?: string) {
    setLoading(true);
    setMensaje("");

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("name", { ascending: true });

    if (teamsError) {
      setMensaje("Error cargando equipos.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

    if (equipos.length === 0) {
      setTeamId("");
      setPlayers([]);
      setLoading(false);
      return;
    }

    const equipoSeleccionado = mantenerTeamId || teamId || equipos[0].id;
    setTeamId(equipoSeleccionado);

    await cargarJugadores(equipoSeleccionado);

    setLoading(false);
  }

  async function cargarJugadores(idEquipo: string) {
    const { data, error } = await supabase
      .from("players")
      .select("id, team_id, name, number, player_type")
      .eq("team_id", idEquipo)
      .order("number", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setMensaje("Error cargando jugadores.");
      return;
    }

    setPlayers((data ?? []) as Player[]);
  }

  async function cambiarEquipo(id: string) {
    setTeamId(id);
    setPlayerId("");
    setNombre("");
    setDorsal("");
    setTipoJugador("M");
    setMensaje("");

    if (id) {
      await cargarJugadores(id);
    } else {
      setPlayers([]);
    }
  }

  function seleccionarJugador(player: Player) {
    setPlayerId(player.id);
    setNombre(player.name);
    setDorsal(player.number.toString());
    setTipoJugador(player.player_type === "F" ? "F" : "M");
    setMensaje("");
  }

  function nuevoJugador() {
    setPlayerId("");
    setNombre("");
    setDorsal("");
    setTipoJugador("M");
    setMensaje("");
  }

  function existeDorsalDuplicado(numero: number) {
    return jugadoresEquipo.some((player) => {
      if (player.id === playerId) return false;
      return player.number === numero;
    });
  }

  function existeNombreDuplicado(nombreJugador: string) {
    const limpio = nombreJugador.trim().toLowerCase();

    return jugadoresEquipo.some((player) => {
      if (player.id === playerId) return false;
      return player.name.trim().toLowerCase() === limpio;
    });
  }

  async function jugadorTieneDatosAsociados(idJugador: string) {
    const { data: votos, error: votosError } = await supabase
      .from("mvp_votes")
      .select("id")
      .eq("player_id", idJugador)
      .limit(1);

    if (votosError) {
      setMensaje("No se ha podido comprobar si el jugador tiene votos.");
      return true;
    }

    if ((votos ?? []).length > 0) return true;

    const { data: partidosJugados } = await supabase
      .from("match_players")
      .select("id")
      .eq("player_id", idJugador)
      .limit(1);

    if ((partidosJugados ?? []).length > 0) return true;

    const { data: goles } = await supabase
      .from("match_goals")
      .select("id")
      .eq("player_id", idJugador)
      .limit(1);

    if ((goles ?? []).length > 0) return true;

    const { data: tarjetas } = await supabase
      .from("match_cards")
      .select("id")
      .eq("player_id", idJugador)
      .limit(1);

    if ((tarjetas ?? []).length > 0) return true;

    const { data: sanciones } = await supabase
      .from("suspensions")
      .select("id")
      .eq("player_id", idJugador)
      .limit(1);

    if ((sanciones ?? []).length > 0) return true;

    return false;
  }

  async function guardarJugador() {
    if (!teamId) {
      setMensaje("Selecciona un equipo.");
      return;
    }

    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setMensaje("Escribe el nombre del jugador.");
      return;
    }

    const numero = Number.parseInt(dorsal, 10);

    if (Number.isNaN(numero) || numero < 0) {
      setMensaje("Escribe un dorsal válido.");
      return;
    }

    if (existeNombreDuplicado(nombreLimpio)) {
      setMensaje("Ya existe un jugador con ese nombre en este equipo.");
      return;
    }

    if (existeDorsalDuplicado(numero)) {
      setMensaje("Ya existe un jugador con ese dorsal en este equipo.");
      return;
    }

    const payload = {
      team_id: teamId,
      name: nombreLimpio,
      number: numero,
      player_type: tipoJugador,
    };

    const { error } = playerId
      ? await supabase.from("players").update(payload).eq("id", playerId)
      : await supabase.from("players").insert(payload);

    if (error) {
      setMensaje(`No se ha podido guardar el jugador: ${error.message}`);
      return;
    }

    setMensaje("Jugador guardado correctamente.");
    nuevoJugador();
    await cargarJugadores(teamId);
  }

  async function eliminarJugador() {
    if (!playerId) return;

    const jugadorActual = jugadoresEquipo.find((player) => player.id === playerId);

    if (!jugadorActual) {
      setMensaje("No se ha encontrado el jugador seleccionado.");
      return;
    }

    const tieneDatos = await jugadorTieneDatosAsociados(playerId);

    if (tieneDatos) {
      setMensaje(
        "No se puede eliminar este jugador porque ya tiene votos, ficha de partido, goles, tarjetas o sanciones asociadas."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar a "${jugadorActual.name}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase.from("players").delete().eq("id", playerId);

    if (error) {
      setMensaje(`No se ha podido eliminar el jugador: ${error.message}`);
      return;
    }

    setMensaje("Jugador eliminado.");
    nuevoJugador();
    await cargarJugadores(teamId);
  }

  function textoTipo(tipo: PlayerType | null) {
    return tipo === "F" ? "Federado" : "Municipio";
  }

  const mensajeCorrecto =
    mensaje.includes("correctamente") || mensaje.includes("eliminado");

  return (
    <AdminGuard>
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
              Jugadores
            </h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Gestión de plantillas
            </p>
          </div>

          <Link
            href="/admin"
            className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
          >
            Volver al panel admin
          </Link>

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            {loading ? (
              <p className="font-bold text-slate-500">Cargando datos...</p>
            ) : teams.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                Todavía no hay equipos creados. Crea primero los equipos.
              </p>
            ) : (
              <>
                <label className="text-sm font-black uppercase text-slate-500">
                  Equipo
                </label>

                <select
                  value={teamId}
                  onChange={(event) => cambiarEquipo(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black">Plantilla</h2>

                      <p className="text-xs font-bold text-slate-500">
                        {jugadoresEquipo.length} jugador
                        {jugadoresEquipo.length === 1 ? "" : "es"}
                      </p>
                    </div>

                    <button
                      onClick={nuevoJugador}
                      className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white"
                    >
                      Nuevo
                    </button>
                  </div>

                  {jugadoresEquipo.length === 0 ? (
                    <p className="mt-3 text-sm font-bold text-slate-500">
                      Este equipo todavía no tiene jugadores.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {jugadoresEquipo.map((player) => (
                        <button
                          key={player.id}
                          onClick={() => seleccionarJugador(player)}
                          className={`flex w-full items-center gap-3 rounded-xl p-3 text-left shadow-sm ${
                            playerId === player.id
                              ? "bg-red-600 text-white"
                              : "bg-white text-slate-900"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                              playerId === player.id
                                ? "bg-white text-red-600"
                                : "bg-emerald-100 text-red-600"
                            }`}
                          >
                            {player.number}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="break-words font-black leading-tight">
                              {player.name}
                            </p>

                            <p
                              className={`mt-1 text-xs font-bold ${
                                playerId === player.id
                                  ? "text-red-100"
                                  : "text-slate-500"
                              }`}
                            >
                              {player.player_type === "F" ? "F" : "M"} ·{" "}
                              {textoTipo(player.player_type)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            <h2 className="text-xl font-black">
              {playerId ? "Editar jugador" : "Nuevo jugador"}
            </h2>

            <div className="mt-4">
              <label className="text-sm font-black uppercase text-slate-500">
                Nombre
              </label>

              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                placeholder="Nombre del jugador"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-black uppercase text-slate-500">
                Dorsal
              </label>

              <input
                type="number"
                min="0"
                value={dorsal}
                onChange={(event) => setDorsal(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                placeholder="0"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-black uppercase text-slate-500">
                Tipo
              </label>

              <select
                value={tipoJugador}
                onChange={(event) =>
                  setTipoJugador(event.target.value as PlayerType)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
              >
                <option value="M">M · Municipio</option>
                <option value="F">F · Federado</option>
              </select>
            </div>

            <button
              onClick={guardarJugador}
              disabled={teams.length === 0}
              className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:bg-slate-300"
            >
              Guardar jugador
            </button>

            {playerId && (
              <button
                onClick={eliminarJugador}
                className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
              >
                Eliminar jugador
              </button>
            )}

            {mensaje && (
              <div
                className={`mt-4 rounded-xl p-3 text-sm font-bold ${
                  mensajeCorrecto
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {mensaje}
              </div>
            )}
          </div>
        </section>
      </main>
    </AdminGuard>
  );
}