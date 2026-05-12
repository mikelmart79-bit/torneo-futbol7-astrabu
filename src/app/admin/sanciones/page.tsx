"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

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

type TeamRef = {
  name: string;
};

type GroupMatch = {
  id: string;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_team: TeamRef | null;
  away_team: TeamRef | null;
};

type RawGroupMatch = Omit<GroupMatch, "home_team" | "away_team"> & {
  home_team: TeamRef[] | TeamRef | null;
  away_team: TeamRef[] | TeamRef | null;
};

type FinalMatch = {
  id: string;
  phase: string;
  title: string;
  home_ref: string;
  away_ref: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
};

type Suspension = {
  id: string;
  player_id: string;
  team_id: string;
  match_id: string | null;
  final_match_id: string | null;
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
  origin: string;
};

type SanctionSettings = {
  id: string;
  yellow_cards_classification: number;
  yellow_suspension_games_classification: number;
  red_card_games_classification: number;
  yellow_cards_final: number;
  yellow_suspension_games_final: number;
  red_card_games_final: number;
  carry_yellows_to_final: boolean;
  updated_at: string | null;
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

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function estadoPendiente(status: string) {
  const limpio = status.trim().toLowerCase();

  return (
    limpio !== "cumplida" &&
    limpio !== "completada" &&
    limpio !== "served" &&
    limpio !== "completed"
  );
}

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

function labelPartidoGrupo(match: GroupMatch) {
  return `${match.home_team?.name ?? "Local"} vs ${
    match.away_team?.name ?? "Visitante"
  } · ${formatearFechaSegura(match.match_date)} · ${
    match.match_time ?? "Hora pendiente"
  }`;
}

function labelPartidoFinal(match: FinalMatch) {
  return `${match.phase} · ${match.title} · ${match.home_ref || "Local"} vs ${
    match.away_ref || "Visitante"
  } · ${formatearFechaSegura(match.match_date)} · ${
    match.match_time ?? "Hora pendiente"
  }`;
}

function numeroConfiguracion(valor: string) {
  const numero = Number.parseInt(valor, 10);
  return Number.isNaN(numero) ? null : numero;
}

export default function AdminSancionesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [finalMatches, setFinalMatches] = useState<FinalMatch[]>([]);

  const [settingsId, setSettingsId] = useState("");
  const [configuracionAbierta, setConfiguracionAbierta] = useState(false);

  const [yellowCardsClassification, setYellowCardsClassification] =
    useState("2");
  const [
    yellowSuspensionGamesClassification,
    setYellowSuspensionGamesClassification,
  ] = useState("1");
  const [redCardGamesClassification, setRedCardGamesClassification] =
    useState("1");

  const [yellowCardsFinal, setYellowCardsFinal] = useState("2");
  const [yellowSuspensionGamesFinal, setYellowSuspensionGamesFinal] =
    useState("1");
  const [redCardGamesFinal, setRedCardGamesFinal] = useState("1");

  const [carryYellowsToFinal, setCarryYellowsToFinal] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [motivo, setMotivo] = useState("Doble amarilla");
  const [detalle, setDetalle] = useState("");
  const [partidos, setPartidos] = useState("1");
  const [origenPartido, setOrigenPartido] = useState("none");

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarConfiguracionSanciones() {
    const { data, error } = await supabase
      .from("sanction_settings")
      .select(
        `
        id,
        yellow_cards_classification,
        yellow_suspension_games_classification,
        red_card_games_classification,
        yellow_cards_final,
        yellow_suspension_games_final,
        red_card_games_final,
        carry_yellows_to_final,
        updated_at
      `,
      )
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error cargando configuración de sanciones:", error);
      setMensaje(
        "No se ha podido cargar la configuración de sanciones. Revisa que estén creadas las columnas nuevas.",
      );
      return;
    }

    if (!data) return;

    const settings = data as SanctionSettings;

    setSettingsId(settings.id);

    setYellowCardsClassification(
      settings.yellow_cards_classification.toString(),
    );
    setYellowSuspensionGamesClassification(
      settings.yellow_suspension_games_classification.toString(),
    );
    setRedCardGamesClassification(
      settings.red_card_games_classification.toString(),
    );

    setYellowCardsFinal(settings.yellow_cards_final.toString());
    setYellowSuspensionGamesFinal(
      settings.yellow_suspension_games_final.toString(),
    );
    setRedCardGamesFinal(settings.red_card_games_final.toString());

    setCarryYellowsToFinal(Boolean(settings.carry_yellows_to_final));
  }

  async function cargarDatos() {
    setLoading(true);
    setMensaje("");

    await cargarConfiguracionSanciones();

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
      .select(
        "id, player_id, team_id, match_id, final_match_id, reason, games, served, status, created_at",
      )
      .order("created_at", { ascending: false });

    if (suspensionsError) {
      console.error("Error cargando sanciones:", suspensionsError);
      setMensaje("No se han podido cargar las sanciones.");
      setLoading(false);
      return;
    }

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select(
        `
        id,
        group_name,
        match_date,
        match_time,
        field,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `,
      )
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      console.error("Error cargando partidos:", matchesError);
      setMensaje("No se han podido cargar los partidos.");
      setLoading(false);
      return;
    }

    const partidosGrupo: GroupMatch[] = (
      (matchesData as unknown as RawGroupMatch[]) || []
    ).map((match) => ({
      ...match,
      home_team: normalizarEquipo(match.home_team),
      away_team: normalizarEquipo(match.away_team),
    }));

    const { data: finalData, error: finalError } = await supabase
      .from("final_matches")
      .select(
        "id, phase, title, home_ref, away_ref, match_date, match_time, field",
      )
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true })
      .order("sort_order", { ascending: true });

    if (finalError) {
      console.error("Error cargando eliminatorias:", finalError);
      setMensaje("No se han podido cargar las eliminatorias.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    const jugadores = (playersData ?? []) as Player[];

    setTeams(equipos);
    setPlayers(jugadores);
    setSuspensions((suspensionsData ?? []) as Suspension[]);
    setGroupMatches(partidosGrupo);
    setFinalMatches((finalData ?? []) as FinalMatch[]);

    if (equipos.length > 0 && !teamId) {
      const primerEquipo = equipos[0].id;
      setTeamId(primerEquipo);

      const primerJugador = jugadores.find(
        (player) => player.team_id === primerEquipo,
      );

      setPlayerId(primerJugador?.id ?? "");
    }

    setLoading(false);
  }

  const jugadoresEquipo = useMemo(() => {
    return players.filter((player) => player.team_id === teamId);
  }, [players, teamId]);

  const rows = useMemo<SuspensionRow[]>((() => {
    return suspensions
      .map((suspension) => {
        const player = players.find((item) => item.id === suspension.player_id);
        const team = teams.find((item) => item.id === suspension.team_id);

        let origin = "Partido no identificado";

        if (suspension.match_id) {
          const match = groupMatches.find(
            (item) => item.id === suspension.match_id,
          );

          if (match) {
            origin = labelPartidoGrupo(match);
          }
        }

        if (suspension.final_match_id) {
          const finalMatch = finalMatches.find(
            (item) => item.id === suspension.final_match_id,
          );

          if (finalMatch) {
            origin = labelPartidoFinal(finalMatch);
          }
        }

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
          origin,
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
  }) as () => SuspensionRow[], [
    suspensions,
    players,
    teams,
    groupMatches,
    finalMatches,
  ]);

  function cambiarEquipo(id: string) {
    setTeamId(id);
    setMensaje("");

    const primerJugador = players.find((player) => player.team_id === id);
    setPlayerId(primerJugador?.id ?? "");
  }

  function partidosSegunMotivo(nuevoMotivo: string) {
    if (nuevoMotivo === "Roja directa" || nuevoMotivo === "Doble amarilla") {
      return redCardGamesClassification;
    }

    if (nuevoMotivo === "Acumulación de amarillas") {
      return yellowSuspensionGamesClassification;
    }

    return partidos;
  }

  function cambiarMotivo(nuevoMotivo: string) {
    setMotivo(nuevoMotivo);
    setPartidos(partidosSegunMotivo(nuevoMotivo));
  }

  function limpiarFormulario() {
    setMotivo("Doble amarilla");
    setDetalle("");
    setPartidos(redCardGamesClassification);
    setOrigenPartido("none");
  }

  function getOrigenPayload() {
    if (origenPartido.startsWith("grupo:")) {
      return {
        match_id: origenPartido.replace("grupo:", ""),
        final_match_id: null,
      };
    }

    if (origenPartido.startsWith("final:")) {
      return {
        match_id: null,
        final_match_id: origenPartido.replace("final:", ""),
      };
    }

    return {
      match_id: null,
      final_match_id: null,
    };
  }

  async function guardarConfiguracionSanciones() {
    setMensaje("");

    const amarillasClasificacion = numeroConfiguracion(
      yellowCardsClassification,
    );
    const partidosAmarillasClasificacion = numeroConfiguracion(
      yellowSuspensionGamesClassification,
    );
    const partidosRojaClasificacion = numeroConfiguracion(
      redCardGamesClassification,
    );

    const amarillasFinal = numeroConfiguracion(yellowCardsFinal);
    const partidosAmarillasFinal = numeroConfiguracion(
      yellowSuspensionGamesFinal,
    );
    const partidosRojaFinal = numeroConfiguracion(redCardGamesFinal);

    if (
      amarillasClasificacion === null ||
      amarillasClasificacion <= 0 ||
      partidosAmarillasClasificacion === null ||
      partidosAmarillasClasificacion <= 0 ||
      partidosRojaClasificacion === null ||
      partidosRojaClasificacion <= 0 ||
      amarillasFinal === null ||
      amarillasFinal <= 0 ||
      partidosAmarillasFinal === null ||
      partidosAmarillasFinal <= 0 ||
      partidosRojaFinal === null ||
      partidosRojaFinal <= 0
    ) {
      setMensaje(
        "Revisa la configuración: todos los valores deben ser mayores que cero.",
      );
      return;
    }

    setGuardandoConfig(true);

    const payload = {
      yellow_cards_classification: amarillasClasificacion,
      yellow_suspension_games_classification: partidosAmarillasClasificacion,
      red_card_games_classification: partidosRojaClasificacion,
      yellow_cards_final: amarillasFinal,
      yellow_suspension_games_final: partidosAmarillasFinal,
      red_card_games_final: partidosRojaFinal,
      carry_yellows_to_final: carryYellowsToFinal,
      updated_at: new Date().toISOString(),
    };

    if (settingsId) {
      const { error } = await supabase
        .from("sanction_settings")
        .update(payload)
        .eq("id", settingsId);

      setGuardandoConfig(false);

      if (error) {
        console.error("Error guardando configuración:", error);
        setMensaje(
          `No se ha podido guardar la configuración: ${error.message}`,
        );
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("sanction_settings")
        .insert(payload)
        .select("id")
        .single();

      setGuardandoConfig(false);

      if (error) {
        console.error("Error creando configuración:", error);
        setMensaje(`No se ha podido crear la configuración: ${error.message}`);
        return;
      }

      setSettingsId(data.id);
    }

    setConfiguracionAbierta(false);
    setMensaje("Configuración de sanciones guardada correctamente.");
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

    const reason = detalleLimpio ? `${motivo} · ${detalleLimpio}` : motivo;

    setGuardando(true);

    const payload = {
      player_id: playerId,
      team_id: teamId,
      ...getOrigenPayload(),
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
              Reglas, sanciones manuales y sanciones activas
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
              <div className="mt-6 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
                <button
                  type="button"
                  onClick={() =>
                    setConfiguracionAbierta((actual) => !actual)
                  }
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <div>
                    <h2 className="text-xl font-black">
                      Configuración de sanciones
                    </h2>

                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Normalmente solo se configura una vez.
                    </p>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xl font-black text-white">
                    {configuracionAbierta ? "−" : "+"}
                  </div>
                </button>

                {configuracionAbierta && (
                  <div className="border-t border-slate-200 p-5 pt-4">
                    <p className="text-sm font-bold text-slate-500">
                      Estas reglas se aplicarán al guardar nuevas fichas de
                      partido. La doble amarilla se trata siempre como roja
                      directa.
                    </p>

                    <div className="mt-5 rounded-3xl bg-slate-100 p-4">
                      <p className="text-sm font-black uppercase tracking-widest text-red-600">
                        Clasificación
                      </p>

                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="text-xs font-black uppercase text-slate-500">
                            Cada cuántas amarillas hay sanción
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={yellowCardsClassification}
                            onChange={(event) =>
                              setYellowCardsClassification(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-center text-xl font-black"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-black uppercase text-slate-500">
                            Partidos de sanción por acumulación
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={yellowSuspensionGamesClassification}
                            onChange={(event) =>
                              setYellowSuspensionGamesClassification(
                                event.target.value,
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-center text-xl font-black"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-black uppercase text-slate-500">
                            Roja directa / doble amarilla
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={redCardGamesClassification}
                            onChange={(event) =>
                              setRedCardGamesClassification(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-center text-xl font-black"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-3xl bg-slate-100 p-4">
                      <p className="text-sm font-black uppercase tracking-widest text-red-600">
                        Eliminatorias
                      </p>

                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="text-xs font-black uppercase text-slate-500">
                            Cada cuántas amarillas hay sanción
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={yellowCardsFinal}
                            onChange={(event) =>
                              setYellowCardsFinal(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-center text-xl font-black"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-black uppercase text-slate-500">
                            Partidos de sanción por acumulación
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={yellowSuspensionGamesFinal}
                            onChange={(event) =>
                              setYellowSuspensionGamesFinal(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-center text-xl font-black"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-black uppercase text-slate-500">
                            Roja directa / doble amarilla
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={redCardGamesFinal}
                            onChange={(event) =>
                              setRedCardGamesFinal(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-center text-xl font-black"
                          />
                        </div>
                      </div>
                    </div>

                    <label className="mt-4 flex items-center justify-between rounded-2xl bg-slate-100 p-4 font-black">
                      <span className="pr-4 text-sm">
                        Arrastrar amarillas de clasificación a eliminatorias
                      </span>

                      <input
                        type="checkbox"
                        checked={carryYellowsToFinal}
                        onChange={(event) =>
                          setCarryYellowsToFinal(event.target.checked)
                        }
                        className="h-6 w-6 shrink-0"
                      />
                    </label>

                    <button
                      onClick={guardarConfiguracionSanciones}
                      disabled={guardandoConfig}
                      className="mt-5 w-full rounded-xl bg-slate-950 py-3 font-black text-white shadow disabled:bg-slate-300"
                    >
                      {guardandoConfig
                        ? "Guardando configuración..."
                        : "Guardar configuración de sanciones"}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <h2 className="text-xl font-black">Nueva sanción manual</h2>

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
                    Partido de origen
                  </label>

                  <select
                    value={origenPartido}
                    onChange={(event) => setOrigenPartido(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    <option value="none">Sin partido identificado</option>

                    {groupMatches.length > 0 && (
                      <optgroup label="Clasificación">
                        {groupMatches.map((match) => (
                          <option key={match.id} value={`grupo:${match.id}`}>
                            {labelPartidoGrupo(match)}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {finalMatches.length > 0 && (
                      <optgroup label="Eliminatorias">
                        {finalMatches.map((match) => (
                          <option key={match.id} value={`final:${match.id}`}>
                            {labelPartidoFinal(match)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    Si seleccionas el partido donde ocurrió el incidente, la
                    sanción se calculará desde ese partido.
                  </p>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-black uppercase text-slate-500">
                    Motivo
                  </label>

                  <select
                    value={motivo}
                    onChange={(event) => cambiarMotivo(event.target.value)}
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
                    placeholder="Ejemplo: insultos al árbitro después del partido"
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
                  disabled={
                    guardando ||
                    teams.length === 0 ||
                    jugadoresEquipo.length === 0
                  }
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

                            <p className="mt-2 text-xs font-bold text-slate-400">
                              Origen: {row.origin}
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