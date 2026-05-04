"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number;
};

export default function AdminJugadoresPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");

  const [nombre, setNombre] = useState("");
  const [dorsal, setDorsal] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const jugadoresEquipo = players.filter((player) => player.team_id === teamId);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("group_name", { ascending: true })
      .order("name", { ascending: true });

    if (teamsError) {
      setMensaje("Error cargando equipos.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

    const primerEquipo = equipos[0];

    if (primerEquipo && !teamId) {
      setTeamId(primerEquipo.id);
      await cargarJugadores(primerEquipo.id);
    } else if (teamId) {
      await cargarJugadores(teamId);
    }

    setLoading(false);
  }

  async function cargarJugadores(idEquipo: string) {
    const { data, error } = await supabase
      .from("players")
      .select("id, team_id, name, number")
      .eq("team_id", idEquipo)
      .order("number", { ascending: true });

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
    setMensaje("");
    await cargarJugadores(id);
  }

  function seleccionarJugador(player: Player) {
    setPlayerId(player.id);
    setNombre(player.name);
    setDorsal(player.number.toString());
    setMensaje("");
  }

  function nuevoJugador() {
    setPlayerId("");
    setNombre("");
    setDorsal("");
    setMensaje("");
  }

  async function guardarJugador() {
    if (!teamId) {
      setMensaje("Selecciona un equipo.");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Escribe el nombre del jugador.");
      return;
    }

    const numero = Number.parseInt(dorsal, 10);

    if (Number.isNaN(numero)) {
      setMensaje("Escribe un dorsal válido.");
      return;
    }

    const payload = {
      team_id: teamId,
      name: nombre.trim(),
      number: numero,
    };

    const { error } = playerId
      ? await supabase.from("players").update(payload).eq("id", playerId)
      : await supabase.from("players").insert(payload);

    if (error) {
      setMensaje("No se ha podido guardar el jugador.");
      return;
    }

    setMensaje("Jugador guardado correctamente.");
    nuevoJugador();
    await cargarJugadores(teamId);
  }

  async function eliminarJugador() {
    if (!playerId) return;

    const { error } = await supabase.from("players").delete().eq("id", playerId);

    if (error) {
      setMensaje("No se ha podido eliminar el jugador.");
      return;
    }

    setMensaje("Jugador eliminado.");
    nuevoJugador();
    await cargarJugadores(teamId);
  }

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
          </div>

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            {loading ? (
              <p className="font-bold text-slate-500">Cargando datos...</p>
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
                      {team.name} · {team.group_name}
                    </option>
                  ))}
                </select>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black">Plantilla</h2>
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
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${
                              playerId === player.id
                                ? "bg-white text-red-600"
                                : "bg-emerald-100 text-red-600"
                            }`}
                          >
                            {player.number}
                          </div>

                          <p className="font-black">{player.name}</p>
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

            <button
              onClick={guardarJugador}
              className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
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
              <div className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm font-bold text-emerald-800">
                {mensaje}
              </div>
            )}
          </div>
        </section>
      </main>
    </AdminGuard>
  );
}