"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type PlayerType = "M" | "F" | "-";

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

type SuspensionRef = {
  id: string;
};

export default function AdminJugadoresPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");

  const [nombre, setNombre] = useState("");
  const [dorsal, setDorsal] = useState("");
  const [tipoJugador, setTipoJugador] = useState<PlayerType>("-");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const jugadoresEquipo = players.filter((player) => player.team_id === teamId);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setTipoJugador("-");
    setMensaje("");

    if (id) {
      await cargarJugadores(id);
    } else {
      setPlayers([]);
    }
  }

  function normalizarTipoJugador(
    tipo: PlayerType | null | undefined,
  ): PlayerType {
    if (tipo === "M" || tipo === "F" || tipo === "-") return tipo;
    return "-";
  }

  function seleccionarJugador(player: Player) {
    setPlayerId(player.id);
    setNombre(player.name);
    setDorsal(player.number.toString());
    setTipoJugador(normalizarTipoJugador(player.player_type));
    setMensaje("");
  }

  function nuevoJugador() {
    setPlayerId("");
    setNombre("");
    setDorsal("");
    setTipoJugador("-");
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

  function errorTablaNoExiste(error: unknown) {
    if (!error || typeof error !== "object") return false;

    const err = error as {
      code?: string;
      message?: string;
      details?: string;
    };

    const texto = `${err.code ?? ""} ${err.message ?? ""} ${
      err.details ?? ""
    }`.toLowerCase();

    return (
      texto.includes("does not exist") ||
      texto.includes("schema cache") ||
      texto.includes("could not find") ||
      texto.includes("relation") ||
      err.code === "42P01" ||
      err.code === "PGRST205"
    );
  }

  async function borrarDatosTablaJugador(
    tableName: string,
    idJugador: string,
    opcional = false,
  ) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("player_id", idJugador);

    if (error) {
      if (opcional && errorTablaNoExiste(error)) return null;
      return error.message;
    }

    return null;
  }

  async function borrarDatosAsociadosJugador(idJugador: string) {
    const { data: suspensionesData, error: suspensionesError } = await supabase
      .from("suspensions")
      .select("id")
      .eq("player_id", idJugador);

    if (suspensionesError) {
      return `No se han podido leer las sanciones del jugador: ${suspensionesError.message}`;
    }

    const suspensiones = (suspensionesData ?? []) as SuspensionRef[];
    const suspensionIds = suspensiones.map((suspension) => suspension.id);

    if (suspensionIds.length > 0) {
      const { error: servedError } = await supabase
        .from("suspension_served_matches")
        .delete()
        .in("suspension_id", suspensionIds);

      if (servedError) {
        return `No se han podido borrar los partidos de sanción cumplidos: ${servedError.message}`;
      }
    }

    const tablasObligatorias = [
      "mvp_votes",
      "match_players",
      "match_goals",
      "match_cards",
      "suspensions",
    ];

    for (const tableName of tablasObligatorias) {
      const error = await borrarDatosTablaJugador(tableName, idJugador);

      if (error) {
        return `No se han podido borrar los datos de ${tableName}: ${error}`;
      }
    }

    const tablasOpcionales = ["mvp_nominees", "mvp_candidates"];

    for (const tableName of tablasOpcionales) {
      const error = await borrarDatosTablaJugador(tableName, idJugador, true);

      if (error) {
        return `No se han podido borrar los datos de ${tableName}: ${error}`;
      }
    }

    return null;
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

    setSaving(true);
    setMensaje("");

    const payload = {
      team_id: teamId,
      name: nombreLimpio,
      number: numero,
      player_type: tipoJugador,
    };

    const { error } = playerId
      ? await supabase.from("players").update(payload).eq("id", playerId)
      : await supabase.from("players").insert(payload);

    setSaving(false);

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

    const jugadorActual = jugadoresEquipo.find(
      (player) => player.id === playerId,
    );

    if (!jugadorActual) {
      setMensaje("No se ha encontrado el jugador seleccionado.");
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar a "${jugadorActual.name}"?\n\nTambién se borrarán sus votos MVP, goles, tarjetas, ficha de partido y sanciones asociadas.`,
    );

    if (!confirmar) return;

    const confirmarFinal = window.confirm(
      "Última confirmación.\n\nEsta acción no se puede deshacer.\n\n¿Eliminar definitivamente el jugador y todos sus datos asociados?",
    );

    if (!confirmarFinal) return;

    setSaving(true);
    setMensaje("");

    const errorBorrandoDatos = await borrarDatosAsociadosJugador(playerId);

    if (errorBorrandoDatos) {
      setSaving(false);
      setMensaje(errorBorrandoDatos);
      return;
    }

    const { error } = await supabase.from("players").delete().eq("id", playerId);

    setSaving(false);

    if (error) {
      setMensaje(`No se ha podido eliminar el jugador: ${error.message}`);
      return;
    }

    setMensaje("Jugador eliminado correctamente.");
    nuevoJugador();
    await cargarJugadores(teamId);
  }

  function textoTipo(tipo: PlayerType | null) {
    if (tipo === "M") return "Municipio";
    if (tipo === "F") return "Federado";
    return "Sin tipo";
  }

  function letraTipo(tipo: PlayerType | null) {
    if (tipo === "M" || tipo === "F") return tipo;
    return "-";
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
                      disabled={saving}
                      className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
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
                          disabled={saving}
                          className={`flex w-full items-center gap-3 rounded-xl p-3 text-left shadow-sm disabled:opacity-60 ${
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
                              {letraTipo(player.player_type)} ·{" "}
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
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold disabled:bg-slate-200 disabled:text-slate-500"
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
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-center text-xl font-black disabled:bg-slate-200 disabled:text-slate-500"
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
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold disabled:bg-slate-200 disabled:text-slate-500"
              >
                <option value="-">- · Sin tipo</option>
                <option value="M">M · Municipio</option>
                <option value="F">F · Federado</option>
              </select>
            </div>

            <button
              onClick={guardarJugador}
              disabled={teams.length === 0 || saving}
              className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:bg-slate-300"
            >
              {saving ? "Guardando..." : "Guardar jugador"}
            </button>

            {playerId && (
              <button
                onClick={eliminarJugador}
                disabled={saving}
                className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-60"
              >
                {saving ? "Eliminando..." : "Eliminar jugador"}
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