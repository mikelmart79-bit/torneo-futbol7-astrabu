"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
};

type PlayerType = "M" | "F";

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  player_type: PlayerType | null;
};

type Suspension = {
  id: string;
  player_id: string;
  team_id: string;
  reason: string;
  games: number;
  served: number;
  status: string;
  created_at: string | null;
};

type SuspensionRow = {
  id: string;
  playerName: string;
  playerNumber: number | null;
  playerType: PlayerType | null;
  teamName: string;
  reason: string;
  games: number;
  served: number;
  status: string;
};

const MOTIVOS = [
  "Doble amarilla",
  "Acumulación de amarillas",
  "Roja directa",
  "Agresión",
  "Insultos",
  "Conducta antideportiva",
  "Decisión comité",
  "Otro",
];

function estadoPendiente(status: string) {
  const limpio = status.trim().toLowerCase();

  return (
    limpio !== "cumplida" &&
    limpio !== "completada" &&
    limpio !== "served" &&
    limpio !== "completed"
  );
}

export default function AdminSancionesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);

  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [motivo, setMotivo] = useState("Doble amarilla");
  const [detalle, setDetalle] = useState("");
  const [partidos, setPartidos] = useState("1");

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    setMensaje("");

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .order("name", { ascending: true });

    if (teamsError) {
      console.error("Error cargando equipos:", teamsError);
      setMensaje("No se han podido cargar los equipos.");
      setLoading(false);
      return;
    }

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, team_id, name, number, player_type")
      .order("number", { ascending: true })
      .order("name", { ascending: true });

    if (playersError) {
      console.error("Error cargando jugadores:", playersError);
      setMensaje("No se han podido cargar los jugadores.");
      setLoading(false);
      return;
    }

    const { data: suspensionsData, error: suspensionsError } = await supabase
      .from("suspensions")
      .select("id, player_id, team_id, reason, games, served, status, created_at")
      .order("created_at", { ascending: false });

    if (suspensionsError) {
      console.error("Error cargando sanciones:", suspensionsError);
      setMensaje("No se han podido cargar las sanciones.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    const jugadores = (playersData ?? []) as Player[];

    setTeams(equipos);
    setPlayers(jugadores);
    setSuspensions((suspensionsData ?? []) as Suspension[]);

    if (equipos.length > 0 && !teamId) {
      const primerEquipo = equipos[0].id;
      setTeamId(primerEquipo);

      const primerJugador = jugadores.find(
        (player) => player.team_id === primerEquipo
      );

      setPlayerId(primerJugador?.id ?? "");
    }

    setLoading(false);
  }

  const jugadoresEquipo = useMemo(() => {
    return players.filter((player) => player.team_id === teamId);
  }, [players, teamId]);

  const rows = useMemo<SuspensionRow[]>(() => {
    return suspensions
      .map((suspension) => {
        const player = players.find((item) => item.id === suspension.player_id);
        const team = teams.find((item) => item.id === suspension.team_id);

        return {
          id: suspension.id,
          playerName: player?.name ?? "Jugador",
          playerNumber: player?.number ?? null,
          playerType: player?.player_type ?? null,
          teamName: team?.name ?? "Equipo",
          reason: suspension.reason,
          games: suspension.games,
          served: suspension.served,
          status: suspension.status,
        };
      })
      .sort((a, b) => {
        const aPendiente = estadoPendiente(a.status);
        const bPendiente = estadoPendiente(b.status);

        if (aPendiente !== bPendiente) return aPendiente ? -1 : 1;

        if (a.teamName !== b.teamName) {
          return a.teamName.localeCompare(b.teamName);
        }

        return a.playerName.localeCompare(b.playerName);
      });
  }, [suspensions, players, teams]);

  function cambiarEquipo(id: string) {
    setTeamId(id);
    setMensaje("");

    const primerJugador = players.find((player) => player.team_id === id);
    setPlayerId(primerJugador?.id ?? "");
  }

  function limpiarFormulario() {
    setMotivo("Doble amarilla");
    setDetalle("");
    setPartidos("1");
  }

  async function guardarSancion() {
    setMensaje("");

    if (!teamId) {
      setMensaje("Selecciona un equipo.");
      return;
    }

    if (!playerId) {
      setMensaje("Selecciona un jugador.");
      return;
    }

    const partidosNumero = Number.parseInt(partidos, 10);

    if (Number.isNaN(partidosNumero) || partidosNumero <= 0) {
      setMensaje("Indica un número válido de partidos.");
      return;
    }

    const detalleLimpio = detalle.trim();

    const reason = detalleLimpio
      ? `${motivo} · ${detalleLimpio}`
      : motivo;

    setGuardando(true);

    const payload = {
      player_id: playerId,
      team_id: teamId,
      match_id: null,
      final_match_id: null,
      reason,
      games: partidosNumero,
      served: 0,
      status: "Activa",
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("suspensions").insert(payload);

    setGuardando(false);

    if (error) {
      console.error("Error guardando sanción:", error);
      setMensaje(`No se ha podido guardar la sanción: ${error.message}`);
      return;
    }

    setMensaje("Sanción guardada correctamente.");
    limpiarFormulario();
    await cargarDatos();
  }

  async function marcarCumplida(id: string, games: number) {
    const { error } = await supabase
      .from("suspensions")
      .update({
        status: "Cumplida",
        served: games,
      })
      .eq("id", id);

    if (error) {
      console.error("Error marcando cumplida:", error);
      setMensaje("No se ha podido marcar la sanción como cumplida.");
      return;
    }

    setMensaje("Sanción marcada como cumplida.");
    await cargarDatos();
  }

  async function reactivarSancion(id: string) {
    const { error } = await supabase
      .from("suspensions")
      .update({
        status: "Activa",
        served: 0,
      })
      .eq("id", id);

    if (error) {
      console.error("Error reactivando sanción:", error);
      setMensaje("No se ha podido reactivar la sanción.");
      return;
    }

    setMensaje("Sanción reactivada.");
    await cargarDatos();
  }

  const mensajeCorrecto =
    mensaje.includes("correctamente") ||
    mensaje.includes("cumplida") ||
    mensaje.includes("reactivada");

  return (
    <AdminGuard>
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
              Sanciones
            </h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Gestión manual de jugadores sancionados
            </p>
          </div>

          <Link
            href="/admin"
            className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
          >
            Volver al panel admin
          </Link>

          {loading ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Cargando sanciones...
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <h2 className="text-xl font-black">Nueva sanción</h2>

                <div className="mt-4">
                  <label className="text-sm font-black uppercase text-slate-500">
                    Equipo
                  </label>

                  <select
                    value={teamId}
                    onChange={(event) => cambiarEquipo(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    {teams.length === 0 ? (
                      <option value="">No hay equipos</option>
                    ) : (
                      teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-black uppercase text-slate-500">
                    Jugador
                  </label>

                  <select
                    value={playerId}
                    onChange={(event) => setPlayerId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    {jugadoresEquipo.length === 0 ? (
                      <option value="">No hay jugadores en este equipo</option>
                    ) : (
                      jugadoresEquipo.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.number !== null
                            ? `${player.number} · ${player.name}`
                            : player.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-black uppercase text-slate-500">
                    Motivo
                  </label>

                  <select
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    {MOTIVOS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-black uppercase text-slate-500">
                    Detalle opcional
                  </label>

                  <textarea
                    value={detalle}
                    onChange={(event) => setDetalle(event.target.value)}
                    className="mt-2 min-h-[90px] w-full rounded-xl border border-slate-300 p-3 font-bold"
                    placeholder="Ejemplo: agresión a rival al finalizar el partido"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-sm font-black uppercase text-slate-500">
                    Partidos de sanción
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={partidos}
                    onChange={(event) => setPartidos(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                  />
                </div>

                <button
                  onClick={guardarSancion}
                  disabled={guardando || teams.length === 0 || jugadoresEquipo.length === 0}
                  className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:bg-slate-300"
                >
                  {guardando ? "Guardando..." : "Guardar sanción"}
                </button>

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

              <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black">Sanciones actuales</h2>

                  <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    {rows.length}
                  </p>
                </div>

                {rows.length === 0 ? (
                  <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    Todavía no hay sanciones registradas.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {rows.map((row) => {
                      const pendiente = estadoPendiente(row.status);
                      const restantes = Math.max(row.games - row.served, 0);
                      const tipo = row.playerType === "F" ? "F" : "M";

                      return (
                        <div
                          key={row.id}
                          className={`rounded-2xl p-4 shadow-sm ${
                            pendiente
                              ? "bg-slate-50 text-slate-900"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-lg font-black text-white">
                              {row.playerNumber ?? "-"}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="break-words text-lg font-black leading-tight">
                                {row.playerName}
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-500">
                                {row.teamName}
                              </p>
                            </div>

                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black shadow ${
                                tipo === "F"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-300 text-slate-700"
                              }`}
                            >
                              {tipo}
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl bg-white p-3">
                            <p className="text-sm font-black text-slate-900">
                              {row.reason}
                            </p>

                            <p className="mt-2 text-sm font-bold text-slate-500">
                              Sanción: {row.games} partido
                              {row.games === 1 ? "" : "s"} · Cumplidos:{" "}
                              {row.served} · Restan: {restantes}
                            </p>
                          </div>

                          {pendiente ? (
                            <button
                              onClick={() => marcarCumplida(row.id, row.games)}
                              className="mt-3 w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white shadow"
                            >
                              Marcar como cumplida
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivarSancion(row.id)}
                              className="mt-3 w-full rounded-xl bg-slate-950 py-3 text-sm font-black text-white shadow"
                            >
                              Reactivar sanción
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}