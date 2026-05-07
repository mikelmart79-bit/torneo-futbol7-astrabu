"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type MatchType = "grupo" | "final";

type TeamRef = {
  id: string;
  name: string;
};

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
};

type GroupMatch = {
  id: string;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
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
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  sort_order: number;
};

type MatchPlayerRow = {
  id: string;
  player_id: string;
  team_id: string;
};

type GoalRow = {
  id: string;
  player_id: string;
  team_id: string;
  minute: number | null;
};

type CardRow = {
  id: string;
  player_id: string;
  team_id: string;
  card_type: "yellow" | "red";
  minute: number | null;
};

type SuspensionRow = {
  id: string;
  player_id: string;
  team_id: string;
  reason: string;
  games: number;
  served: number;
  status: string;
};

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function numeroDesdeInput(valor: string) {
  return valor.trim() === "" ? null : Number.parseInt(valor, 10);
}

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

export default function AdminFichasPartidoPage() {
  const [matchType, setMatchType] = useState<MatchType>("grupo");
  const [selectedId, setSelectedId] = useState("");

  const [teams, setTeams] = useState<Team[]>([]);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [finalMatches, setFinalMatches] = useState<FinalMatch[]>([]);

  const [players, setPlayers] = useState<Player[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayerRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [suspensions, setSuspensions] = useState<SuspensionRow[]>([]);

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const [fichaTitulo, setFichaTitulo] = useState("");
  const [fichaSubtitulo, setFichaSubtitulo] = useState("");
  const [fichaAviso, setFichaAviso] = useState("");

  const [goalPlayerId, setGoalPlayerId] = useState("");
  const [goalMinute, setGoalMinute] = useState("");

  const [cardPlayerId, setCardPlayerId] = useState("");
  const [cardType, setCardType] = useState<"yellow" | "red">("yellow");
  const [cardMinute, setCardMinute] = useState("");

  const [suspensionPlayerId, setSuspensionPlayerId] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspensionGames, setSuspensionGames] = useState("1");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingFicha, setLoadingFicha] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  function payloadPartido(tipo: MatchType, id: string) {
    return tipo === "grupo"
      ? { match_id: id, final_match_id: null }
      : { match_id: null, final_match_id: id };
  }

  function columnaPartido(tipo: MatchType) {
    return tipo === "grupo" ? "match_id" : "final_match_id";
  }

  function nombreEquipo(teamId: string) {
    return teams.find((team) => team.id === teamId)?.name ?? "Equipo";
  }

  function nombreJugador(playerId: string) {
    const player = players.find((item) => item.id === playerId);
    if (!player) return "Jugador";
    return player.number !== null
      ? `${player.number} · ${player.name}`
      : player.name;
  }

  function equipoJugador(playerId: string) {
    const player = players.find((item) => item.id === playerId);
    if (!player) return "";
    return nombreEquipo(player.team_id);
  }

  function jugadorCompleto(player: Player) {
    const dorsal = player.number !== null ? `${player.number} · ` : "";
    return `${dorsal}${player.name} · ${nombreEquipo(player.team_id)}`;
  }

  function limpiarFicha() {
    setPlayers([]);
    setMatchPlayers([]);
    setGoals([]);
    setCards([]);
    setSuspensions([]);
    setSelectedPlayerIds([]);
    setFichaTitulo("");
    setFichaSubtitulo("");
    setFichaAviso("");
    setGoalPlayerId("");
    setGoalMinute("");
    setCardPlayerId("");
    setCardType("yellow");
    setCardMinute("");
    setSuspensionPlayerId("");
    setSuspensionReason("");
    setSuspensionGames("1");
  }

  async function cargarDatos() {
    setLoading(true);

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("name", { ascending: true });

    if (teamsError) {
      setMensaje("No se han podido cargar los equipos.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select(
        `
        id,
        group_name,
        match_date,
        match_time,
        field,
        home_score,
        away_score,
        status,
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name)
      `
      )
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      setMensaje("No se han podido cargar los partidos.");
      setLoading(false);
      return;
    }

    const partidos: GroupMatch[] = ((matchesData as unknown as RawGroupMatch[]) || []).map(
      (match) => ({
        ...match,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      })
    );

    setGroupMatches(partidos);

    const { data: finalData, error: finalError } = await supabase
      .from("final_matches")
      .select(
        "id, phase, title, home_ref, away_ref, match_date, match_time, field, home_score, away_score, status, sort_order"
      )
      .order("sort_order", { ascending: true });

    if (finalError) {
      setMensaje("No se han podido cargar las eliminatorias.");
      setLoading(false);
      return;
    }

    const eliminatorias = (finalData ?? []) as FinalMatch[];
    setFinalMatches(eliminatorias);

    const primerId = partidos[0]?.id ?? eliminatorias[0]?.id ?? "";
    const primerTipo: MatchType = partidos[0]?.id ? "grupo" : "final";

    setMatchType(primerTipo);
    setSelectedId(primerId);

    if (primerId) {
      await cargarFicha(primerTipo, primerId, equipos, partidos, eliminatorias);
    }

    setLoading(false);
  }

  function obtenerEquiposFicha(
    tipo: MatchType,
    id: string,
    equipos: Team[],
    partidos: GroupMatch[],
    eliminatorias: FinalMatch[]
  ) {
    if (tipo === "grupo") {
      const partido = partidos.find((item) => item.id === id);
      if (!partido) {
        return {
          titulo: "",
          subtitulo: "",
          aviso: "No se ha encontrado el partido.",
          equiposFicha: [] as TeamRef[],
        };
      }

      const equiposFicha = [partido.home_team, partido.away_team].filter(
        Boolean
      ) as TeamRef[];

      return {
        titulo: `${partido.home_team?.name ?? "Local"} vs ${
          partido.away_team?.name ?? "Visitante"
        }`,
        subtitulo: `${formatearFechaSegura(partido.match_date)} · ${
          partido.match_time ?? "Hora pendiente"
        } · ${partido.field ?? "Campo pendiente"}`,
        aviso: "",
        equiposFicha,
      };
    }

    const eliminatoria = eliminatorias.find((item) => item.id === id);
    if (!eliminatoria) {
      return {
        titulo: "",
        subtitulo: "",
        aviso: "No se ha encontrado la eliminatoria.",
        equiposFicha: [] as TeamRef[],
      };
    }

    const local = equipos.find(
      (team) => normalizarTexto(team.name) === normalizarTexto(eliminatoria.home_ref)
    );
    const visitante = equipos.find(
      (team) => normalizarTexto(team.name) === normalizarTexto(eliminatoria.away_ref)
    );

    const equiposFicha = [local, visitante]
      .filter(Boolean)
      .map((team) => ({
        id: team!.id,
        name: team!.name,
      }));

    const aviso =
      equiposFicha.length < 2
        ? "Esta eliminatoria todavía no tiene los dos equipos resueltos. Cuando aparezcan los nombres reales, podrás completar la ficha."
        : "";

    return {
      titulo: `${eliminatoria.home_ref} vs ${eliminatoria.away_ref}`,
      subtitulo: `${eliminatoria.phase} · ${eliminatoria.title} · ${formatearFechaSegura(
        eliminatoria.match_date
      )} · ${eliminatoria.match_time ?? "Hora pendiente"} · ${
        eliminatoria.field ?? "Campo pendiente"
      }`,
      aviso,
      equiposFicha,
    };
  }

  async function cargarFicha(
    tipo: MatchType,
    id: string,
    equiposBase = teams,
    partidosBase = groupMatches,
    eliminatoriasBase = finalMatches
  ) {
    if (!id) {
      limpiarFicha();
      return;
    }

    setLoadingFicha(true);
    setMensaje("");

    const datosFicha = obtenerEquiposFicha(
      tipo,
      id,
      equiposBase,
      partidosBase,
      eliminatoriasBase
    );

    setFichaTitulo(datosFicha.titulo);
    setFichaSubtitulo(datosFicha.subtitulo);
    setFichaAviso(datosFicha.aviso);

    const teamIds = datosFicha.equiposFicha.map((team) => team.id);

    let jugadores: Player[] = [];

    if (teamIds.length > 0) {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, team_id, name, number")
        .in("team_id", teamIds)
        .order("number", { ascending: true })
        .order("name", { ascending: true });

      if (playersError) {
        setMensaje("No se han podido cargar los jugadores.");
        setLoadingFicha(false);
        return;
      }

      jugadores = ((playersData ?? []) as Player[]).sort((a, b) => {
        const equipoA = nombreEquipo(a.team_id);
        const equipoB = nombreEquipo(b.team_id);
        if (equipoA !== equipoB) return equipoA.localeCompare(equipoB);

        const dorsalA = a.number ?? 9999;
        const dorsalB = b.number ?? 9999;
        if (dorsalA !== dorsalB) return dorsalA - dorsalB;

        return a.name.localeCompare(b.name);
      });
    }

    setPlayers(jugadores);

    const columna = columnaPartido(tipo);

    const { data: matchPlayersData } = await supabase
      .from("match_players")
      .select("id, player_id, team_id")
      .eq(columna, id);

    const participantes = (matchPlayersData ?? []) as MatchPlayerRow[];
    setMatchPlayers(participantes);
    setSelectedPlayerIds(participantes.map((item) => item.player_id));

    const { data: goalsData } = await supabase
      .from("match_goals")
      .select("id, player_id, team_id, minute")
      .eq(columna, id)
      .order("created_at", { ascending: true });

    setGoals((goalsData ?? []) as GoalRow[]);

    const { data: cardsData } = await supabase
      .from("match_cards")
      .select("id, player_id, team_id, card_type, minute")
      .eq(columna, id)
      .order("created_at", { ascending: true });

    setCards((cardsData ?? []) as CardRow[]);

    const { data: suspensionsData } = await supabase
      .from("suspensions")
      .select("id, player_id, team_id, reason, games, served, status")
      .eq(columna, id)
      .order("created_at", { ascending: true });

    setSuspensions((suspensionsData ?? []) as SuspensionRow[]);

    setGoalPlayerId("");
    setGoalMinute("");
    setCardPlayerId("");
    setCardType("yellow");
    setCardMinute("");
    setSuspensionPlayerId("");
    setSuspensionReason("");
    setSuspensionGames("1");

    setLoadingFicha(false);
  }

  async function cambiarTipo(tipo: MatchType) {
    const nuevoId =
      tipo === "grupo" ? groupMatches[0]?.id ?? "" : finalMatches[0]?.id ?? "";

    setMatchType(tipo);
    setSelectedId(nuevoId);
    await cargarFicha(tipo, nuevoId);
  }

  async function cambiarPartido(id: string) {
    setSelectedId(id);
    await cargarFicha(matchType, id);
  }

  function toggleJugador(playerId: string) {
    setSelectedPlayerIds((actuales) =>
      actuales.includes(playerId)
        ? actuales.filter((id) => id !== playerId)
        : [...actuales, playerId]
    );
  }

  async function guardarJugadores() {
    if (!selectedId) return;

    const columna = columnaPartido(matchType);

    const { error: deleteError } = await supabase
      .from("match_players")
      .delete()
      .eq(columna, selectedId);

    if (deleteError) {
      setMensaje("No se han podido actualizar los jugadores.");
      return;
    }

    const filas = selectedPlayerIds
      .map((playerId) => {
        const player = players.find((item) => item.id === playerId);
        if (!player) return null;

        return {
          ...payloadPartido(matchType, selectedId),
          player_id: player.id,
          team_id: player.team_id,
          played: true,
        };
      })
      .filter(Boolean);

    if (filas.length > 0) {
      const { error: insertError } = await supabase
        .from("match_players")
        .insert(filas);

      if (insertError) {
        setMensaje("No se han podido guardar los jugadores.");
        return;
      }
    }

    setMensaje("Jugadores de la ficha guardados.");
    await cargarFicha(matchType, selectedId);
  }

  async function añadirGol() {
    if (!selectedId || !goalPlayerId) {
      setMensaje("Selecciona un jugador para añadir el gol.");
      return;
    }

    const player = players.find((item) => item.id === goalPlayerId);
    if (!player) {
      setMensaje("No se ha encontrado el jugador.");
      return;
    }

    const minute = numeroDesdeInput(goalMinute);

    if (minute !== null && minute < 0) {
      setMensaje("El minuto no puede ser negativo.");
      return;
    }

    const { error } = await supabase.from("match_goals").insert({
      ...payloadPartido(matchType, selectedId),
      player_id: player.id,
      team_id: player.team_id,
      minute,
    });

    if (error) {
      setMensaje("No se ha podido añadir el gol.");
      return;
    }

    setMensaje("Gol añadido correctamente.");
    await cargarFicha(matchType, selectedId);
  }

  async function añadirTarjeta() {
    if (!selectedId || !cardPlayerId) {
      setMensaje("Selecciona un jugador para añadir la tarjeta.");
      return;
    }

    const player = players.find((item) => item.id === cardPlayerId);
    if (!player) {
      setMensaje("No se ha encontrado el jugador.");
      return;
    }

    const minute = numeroDesdeInput(cardMinute);

    if (minute !== null && minute < 0) {
      setMensaje("El minuto no puede ser negativo.");
      return;
    }

    const { error } = await supabase.from("match_cards").insert({
      ...payloadPartido(matchType, selectedId),
      player_id: player.id,
      team_id: player.team_id,
      card_type: cardType,
      minute,
    });

    if (error) {
      setMensaje("No se ha podido añadir la tarjeta.");
      return;
    }

    if (cardType === "red") {
      const crearSancion = window.confirm(
        "Has añadido una tarjeta roja. ¿Quieres crear una sanción de 1 partido?"
      );

      if (crearSancion) {
        await supabase.from("suspensions").insert({
          ...payloadPartido(matchType, selectedId),
          player_id: player.id,
          team_id: player.team_id,
          reason: "Tarjeta roja",
          games: 1,
          served: 0,
          status: "Pendiente",
        });
      }
    }

    setMensaje("Tarjeta añadida correctamente.");
    await cargarFicha(matchType, selectedId);
  }

  async function añadirSancion() {
    if (!selectedId || !suspensionPlayerId) {
      setMensaje("Selecciona un jugador para añadir la sanción.");
      return;
    }

    const player = players.find((item) => item.id === suspensionPlayerId);
    if (!player) {
      setMensaje("No se ha encontrado el jugador.");
      return;
    }

    const games = numeroDesdeInput(suspensionGames) ?? 1;

    if (games <= 0) {
      setMensaje("Los partidos de sanción deben ser mayores que cero.");
      return;
    }

    const { error } = await supabase.from("suspensions").insert({
      ...payloadPartido(matchType, selectedId),
      player_id: player.id,
      team_id: player.team_id,
      reason: suspensionReason.trim() || "Sanción",
      games,
      served: 0,
      status: "Pendiente",
    });

    if (error) {
      setMensaje("No se ha podido añadir la sanción.");
      return;
    }

    setMensaje("Sanción añadida correctamente.");
    await cargarFicha(matchType, selectedId);
  }

  async function eliminarFila(
    tabla: "match_goals" | "match_cards" | "suspensions",
    id: string
  ) {
    const confirmar = window.confirm("¿Eliminar este registro?");
    if (!confirmar) return;

    const { error } = await supabase.from(tabla).delete().eq("id", id);

    if (error) {
      setMensaje("No se ha podido eliminar el registro.");
      return;
    }

    setMensaje("Registro eliminado.");
    await cargarFicha(matchType, selectedId);
  }

  async function cambiarEstadoSancion(sancion: SuspensionRow, estado: string) {
    const { error } = await supabase
      .from("suspensions")
      .update({
        status: estado,
        served: estado === "Cumplida" ? sancion.games : 0,
      })
      .eq("id", sancion.id);

    if (error) {
      setMensaje("No se ha podido actualizar la sanción.");
      return;
    }

    setMensaje("Sanción actualizada.");
    await cargarFicha(matchType, selectedId);
  }

  const partidosDisponibles =
    matchType === "grupo" ? groupMatches : finalMatches;

  const mensajeCorrecto =
    mensaje.includes("guardad") ||
    mensaje.includes("añadid") ||
    mensaje.includes("actualizad") ||
    mensaje.includes("eliminad");

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
              Fichas de partido
            </h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Jugadores, goles, tarjetas y sanciones
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
              Cargando fichas...
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <label className="text-sm font-black uppercase text-slate-500">
                  Tipo de partido
                </label>

                <select
                  value={matchType}
                  onChange={(event) =>
                    cambiarTipo(event.target.value as MatchType)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="grupo">Clasificación</option>
                  <option value="final">Eliminatorias</option>
                </select>

                <label className="mt-4 block text-sm font-black uppercase text-slate-500">
                  Partido
                </label>

                <select
                  value={selectedId}
                  onChange={(event) => cambiarPartido(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  {partidosDisponibles.length === 0 ? (
                    <option value="">No hay partidos disponibles</option>
                  ) : matchType === "grupo" ? (
                    groupMatches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.home_team?.name ?? "Local"} vs{" "}
                        {match.away_team?.name ?? "Visitante"} ·{" "}
                        {formatearFechaSegura(match.match_date)} ·{" "}
                        {match.match_time ?? "Hora pendiente"}
                      </option>
                    ))
                  ) : (
                    finalMatches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.phase} · {match.title} · {match.home_ref} vs{" "}
                        {match.away_ref}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {loadingFicha ? (
                <div className="rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
                  Cargando ficha...
                </div>
              ) : selectedId ? (
                <>
                  <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                    <p className="text-sm font-black uppercase tracking-widest text-red-600">
                      Partido seleccionado
                    </p>

                    <h2 className="mt-2 text-2xl font-black leading-tight">
                      {fichaTitulo}
                    </h2>

                    <p className="mt-2 text-sm font-bold text-slate-500">
                      {fichaSubtitulo}
                    </p>

                    {fichaAviso && (
                      <div className="mt-4 rounded-2xl bg-yellow-100 p-4 text-sm font-bold text-yellow-900">
                        {fichaAviso}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                      Jugadores que han jugado
                    </p>

                    {players.length === 0 ? (
                      <p className="mt-3 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                        No hay jugadores disponibles para esta ficha.
                      </p>
                    ) : (
                      <>
                        <div className="mt-4 space-y-3">
                          {players.map((player) => (
                            <label
                              key={player.id}
                              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100 p-4"
                            >
                              <div>
                                <p className="font-black leading-tight">
                                  {player.number !== null
                                    ? `${player.number} · ${player.name}`
                                    : player.name}
                                </p>
                                <p className="text-sm font-bold text-slate-500">
                                  {nombreEquipo(player.team_id)}
                                </p>
                              </div>

                              <input
                                type="checkbox"
                                checked={selectedPlayerIds.includes(player.id)}
                                onChange={() => toggleJugador(player.id)}
                                className="h-6 w-6"
                              />
                            </label>
                          ))}
                        </div>

                        <button
                          onClick={guardarJugadores}
                          className="mt-5 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                        >
                          Guardar jugadores
                        </button>
                      </>
                    )}
                  </div>

                  <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                    <p className="text-sm font-black uppercase tracking-widest text-red-600">
                      Goles
                    </p>

                    <div className="mt-4 space-y-3">
                      <select
                        value={goalPlayerId}
                        onChange={(event) => setGoalPlayerId(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                      >
                        <option value="">Seleccionar jugador</option>
                        {players.map((player) => (
                          <option key={player.id} value={player.id}>
                            {jugadorCompleto(player)}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0"
                        value={goalMinute}
                        onChange={(event) => setGoalMinute(event.target.value)}
                        placeholder="Minuto opcional"
                        className="w-full rounded-xl border border-slate-300 p-3 font-bold"
                      />

                      <button
                        onClick={añadirGol}
                        className="w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                      >
                        Añadir gol
                      </button>
                    </div>

                    <div className="mt-5 space-y-3">
                      {goals.length === 0 ? (
                        <p className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                          Todavía no hay goles en esta ficha.
                        </p>
                      ) : (
                        goals.map((goal, index) => (
                          <div
                            key={goal.id}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100 p-4"
                          >
                            <div>
                              <p className="font-black">
                                {index + 1}. {nombreJugador(goal.player_id)}
                              </p>
                              <p className="text-sm font-bold text-slate-500">
                                {nombreEquipo(goal.team_id)}
                                {goal.minute !== null
                                  ? ` · Min. ${goal.minute}`
                                  : ""}
                              </p>
                            </div>

                            <button
                              onClick={() => eliminarFila("match_goals", goal.id)}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
                            >
                              Eliminar
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                      Tarjetas
                    </p>

                    <div className="mt-4 space-y-3">
                      <select
                        value={cardPlayerId}
                        onChange={(event) => setCardPlayerId(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                      >
                        <option value="">Seleccionar jugador</option>
                        {players.map((player) => (
                          <option key={player.id} value={player.id}>
                            {jugadorCompleto(player)}
                          </option>
                        ))}
                      </select>

                      <select
                        value={cardType}
                        onChange={(event) =>
                          setCardType(event.target.value as "yellow" | "red")
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                      >
                        <option value="yellow">Tarjeta amarilla</option>
                        <option value="red">Tarjeta roja</option>
                      </select>

                      <input
                        type="number"
                        min="0"
                        value={cardMinute}
                        onChange={(event) => setCardMinute(event.target.value)}
                        placeholder="Minuto opcional"
                        className="w-full rounded-xl border border-slate-300 p-3 font-bold"
                      />

                      <button
                        onClick={añadirTarjeta}
                        className="w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                      >
                        Añadir tarjeta
                      </button>
                    </div>

                    <div className="mt-5 space-y-3">
                      {cards.length === 0 ? (
                        <p className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                          Todavía no hay tarjetas en esta ficha.
                        </p>
                      ) : (
                        cards.map((card) => (
                          <div
                            key={card.id}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100 p-4"
                          >
                            <div>
                              <p className="font-black">
                                {card.card_type === "yellow" ? "🟨" : "🟥"}{" "}
                                {nombreJugador(card.player_id)}
                              </p>
                              <p className="text-sm font-bold text-slate-500">
                                {nombreEquipo(card.team_id)}
                                {card.minute !== null
                                  ? ` · Min. ${card.minute}`
                                  : ""}
                              </p>
                            </div>

                            <button
                              onClick={() => eliminarFila("match_cards", card.id)}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
                            >
                              Eliminar
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                    <p className="text-sm font-black uppercase tracking-widest text-red-600">
                      Sancionados
                    </p>

                    <div className="mt-4 space-y-3">
                      <select
                        value={suspensionPlayerId}
                        onChange={(event) =>
                          setSuspensionPlayerId(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                      >
                        <option value="">Seleccionar jugador</option>
                        {players.map((player) => (
                          <option key={player.id} value={player.id}>
                            {jugadorCompleto(player)}
                          </option>
                        ))}
                      </select>

                      <input
                        value={suspensionReason}
                        onChange={(event) =>
                          setSuspensionReason(event.target.value)
                        }
                        placeholder="Motivo de la sanción"
                        className="w-full rounded-xl border border-slate-300 p-3 font-bold"
                      />

                      <input
                        type="number"
                        min="1"
                        value={suspensionGames}
                        onChange={(event) =>
                          setSuspensionGames(event.target.value)
                        }
                        placeholder="Partidos de sanción"
                        className="w-full rounded-xl border border-slate-300 p-3 font-bold"
                      />

                      <button
                        onClick={añadirSancion}
                        className="w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                      >
                        Añadir sanción
                      </button>
                    </div>

                    <div className="mt-5 space-y-3">
                      {suspensions.length === 0 ? (
                        <p className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                          No hay sanciones asociadas a esta ficha.
                        </p>
                      ) : (
                        suspensions.map((sancion) => (
                          <div
                            key={sancion.id}
                            className="rounded-2xl bg-slate-100 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-black">
                                  {nombreJugador(sancion.player_id)}
                                </p>
                                <p className="text-sm font-bold text-slate-500">
                                  {equipoJugador(sancion.player_id)}
                                </p>
                                <p className="mt-2 text-sm font-bold text-slate-700">
                                  {sancion.reason}
                                </p>
                                <p className="mt-1 text-sm font-bold text-red-600">
                                  {sancion.games} partido(s) · {sancion.status}
                                </p>
                              </div>

                              <button
                                onClick={() =>
                                  eliminarFila("suspensions", sancion.id)
                                }
                                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
                              >
                                Eliminar
                              </button>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  cambiarEstadoSancion(sancion, "Pendiente")
                                }
                                className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900 shadow"
                              >
                                Pendiente
                              </button>

                              <button
                                onClick={() =>
                                  cambiarEstadoSancion(sancion, "Cumplida")
                                }
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow"
                              >
                                Cumplida
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {mensaje && (
                    <div
                      className={`rounded-2xl p-4 text-sm font-bold shadow ${
                        mensajeCorrecto
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {mensaje}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-3xl bg-white/95 p-5 font-bold text-slate-500 shadow-2xl">
                  No hay partidos disponibles para crear fichas.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}