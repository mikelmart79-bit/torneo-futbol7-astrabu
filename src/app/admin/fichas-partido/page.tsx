"use client";

import { useEffect, useMemo, useState } from "react";
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
  mvp_open: boolean | null;
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
  home_penalties: number | null;
  away_penalties: number | null;
  status: string | null;
  sort_order: number;
  mvp_open: boolean | null;
  home_source_type?: string | null;
  home_source_match_title?: string | null;
  away_source_type?: string | null;
  away_source_match_title?: string | null;
};

type MatchPayload = {
  match_id: string | null;
  final_match_id: string | null;
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
};

type CardRow = {
  id: string;
  player_id: string;
  team_id: string;
  card_type: "yellow" | "red";
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

type SuspensionMatchRef = {
  id: string;
  tipo: MatchType;
  dateValue: number;
};

type SuspensionInfo = {
  id: string;
  reason: string;
  games: number;
  served: number;
  restantes: number;
  partidoActual: number;
};

type FichaRow = {
  player: Player;
  played: boolean;
  goals: number;
  yellow: number;
  red: number;
  suspended: boolean;
  suspensionId: string;
  suspensionReason: string;
  suspensionGames: number;
  suspensionServed: number;
  suspensionRestantes: number;
  suspensionPartidoActual: number;
};

type CalendarMonth = {
  year: number;
  monthIndex: number;
};

type AdminCalendarMatch = {
  id: string;
  tipo: MatchType;
  phase: string;
  title: string;
  match_date: string;
  match_time: string | null;
  field: string | null;
  home_name: string;
  away_name: string;
  status: string | null;
  sort_order: number;
};

const DEFAULT_MONTHS: CalendarMonth[] = [
  { year: 2026, monthIndex: 6 },
  { year: 2026, monthIndex: 7 },
];

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function estadoPendiente(status: string | null | undefined) {
  const limpio = normalizarTexto(status);

  return (
    limpio !== "cumplida" &&
    limpio !== "completada" &&
    limpio !== "served" &&
    limpio !== "completed"
  );
}

function estadoCuentaComoCumplido(status: string | null | undefined) {
  const limpio = normalizarTexto(status);

  return (
    limpio === "finalizado" ||
    limpio === "cerrado" ||
    limpio === "finished" ||
    limpio === "closed"
  );
}

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

function formatearJornada(fecha: string) {
  const [year, month, day] = fecha.split("-");

  return `${day}/${month}/${year.slice(2)}`;
}

function numeroDesdeInput(valor: string) {
  if (valor.trim() === "") return null;
  const numero = Number.parseInt(valor, 10);
  return Number.isNaN(numero) ? null : numero;
}

function opcionesNumero(max: number) {
  return Array.from({ length: max + 1 }, (_, index) => index);
}

function fechaPartidoValor(fecha: string | null, hora: string | null) {
  if (!fecha) return Number.POSITIVE_INFINITY;

  const [year, month, day] = fecha.split("-").map(Number);
  const [hour, minute] = (hora ?? "23:59").split(":").map(Number);

  return new Date(year, month - 1, day, hour || 0, minute || 0).getTime();
}

function fechaCreacionValor(createdAt: string | null) {
  if (!createdAt) return Date.now();

  const value = new Date(createdAt).getTime();

  return Number.isNaN(value) ? Date.now() : value;
}

function fechaToParts(fecha: string) {
  const [year, month, day] = fecha.split("-").map(Number);

  return {
    year,
    monthIndex: month - 1,
    day,
  };
}

function fechaDesdeParts(year: number, monthIndex: number, day: number) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");

  return `${year}-${month}-${dayText}`;
}

function nombreMes(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}

function partidosEquipoParaSancion(
  teamId: string,
  teamName: string,
  partidos: GroupMatch[],
  eliminatorias: FinalMatch[]
) {
  const nombreNormalizado = normalizarTexto(teamName);

  const partidosGrupo: SuspensionMatchRef[] = partidos
    .filter(
      (match) =>
        match.home_team?.id === teamId || match.away_team?.id === teamId
    )
    .map((match) => ({
      id: match.id,
      tipo: "grupo" as MatchType,
      dateValue: fechaPartidoValor(match.match_date, match.match_time),
    }));

  const partidosFinales: SuspensionMatchRef[] = eliminatorias
    .filter(
      (match) =>
        normalizarTexto(match.home_ref) === nombreNormalizado ||
        normalizarTexto(match.away_ref) === nombreNormalizado
    )
    .map((match) => ({
      id: match.id,
      tipo: "final" as MatchType,
      dateValue: fechaPartidoValor(match.match_date, match.match_time),
    }));

  return [...partidosGrupo, ...partidosFinales].sort((a, b) => {
    if (a.dateValue !== b.dateValue) return a.dateValue - b.dateValue;
    return a.id.localeCompare(b.id);
  });
}

function origenSancionValor(
  suspension: Suspension,
  partidos: GroupMatch[],
  eliminatorias: FinalMatch[]
) {
  if (suspension.match_id) {
    const match = partidos.find((item) => item.id === suspension.match_id);

    if (match) {
      return fechaPartidoValor(match.match_date, match.match_time);
    }
  }

  if (suspension.final_match_id) {
    const match = eliminatorias.find(
      (item) => item.id === suspension.final_match_id
    );

    if (match) {
      return fechaPartidoValor(match.match_date, match.match_time);
    }
  }

  return fechaCreacionValor(suspension.created_at);
}

function ordenarCalendario(partidos: AdminCalendarMatch[]) {
  return [...partidos].sort((a, b) => {
    if (a.match_date !== b.match_date) {
      return a.match_date.localeCompare(b.match_date);
    }

    const horaA = a.match_time ?? "99:99";
    const horaB = b.match_time ?? "99:99";

    if (horaA !== horaB) return horaA.localeCompare(horaB);

    return a.sort_order - b.sort_order;
  });
}

export default function AdminFichasPartidoPage() {
  const [matchType, setMatchType] = useState<MatchType>("grupo");
  const [selectedId, setSelectedId] = useState("");

  const [teams, setTeams] = useState<Team[]>([]);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [finalMatches, setFinalMatches] = useState<FinalMatch[]>([]);

  const [homeTeam, setHomeTeam] = useState<TeamRef | null>(null);
  const [awayTeam, setAwayTeam] = useState<TeamRef | null>(null);

  const [fichaTitulo, setFichaTitulo] = useState("");
  const [fichaSubtitulo, setFichaSubtitulo] = useState("");
  const [fichaAviso, setFichaAviso] = useState("");

  const [rows, setRows] = useState<FichaRow[]>([]);
  const [estado, setEstado] = useState("Pendiente");
  const [mvpOpen, setMvpOpen] = useState(false);

  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  const [homePenalties, setHomePenalties] = useState("");
  const [awayPenalties, setAwayPenalties] = useState("");

  const [selectedDate, setSelectedDate] = useState("");
  const [monthPosition, setMonthPosition] = useState(0);

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  function payloadPartido(tipo: MatchType, id: string): MatchPayload {
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

  function jugadorNombre(player: Player) {
    return player.number !== null
      ? `${player.number} · ${player.name}`
      : player.name;
  }

  function limpiarFicha() {
    setHomeTeam(null);
    setAwayTeam(null);
    setFichaTitulo("");
    setFichaSubtitulo("");
    setFichaAviso("");
    setRows([]);
    setEstado("Pendiente");
    setMvpOpen(false);
    setHomeScore("");
    setAwayScore("");
    setHomePenalties("");
    setAwayPenalties("");
  }

  async function cargarDatos(opciones?: {
    tipoMantener?: MatchType;
    idMantener?: string;
  }) {
    setLoading(true);

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("name", { ascending: true });

    if (teamsError) {
      console.error("Error cargando equipos:", teamsError);
      setMensaje(`No se han podido cargar los equipos: ${teamsError.message}`);
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
        mvp_open,
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name)
      `
      )
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      console.error("Error cargando partidos:", matchesError);
      setMensaje(
        `No se han podido cargar los partidos: ${matchesError.message}`
      );
      setLoading(false);
      return;
    }

    const partidos: GroupMatch[] = (
      (matchesData as unknown as RawGroupMatch[]) || []
    ).map((match) => ({
      ...match,
      home_team: normalizarEquipo(match.home_team),
      away_team: normalizarEquipo(match.away_team),
    }));

    setGroupMatches(partidos);

    const { data: finalData, error: finalError } = await supabase
      .from("final_matches")
      .select(
        `
        id,
        phase,
        title,
        home_ref,
        away_ref,
        match_date,
        match_time,
        field,
        home_score,
        away_score,
        home_penalties,
        away_penalties,
        status,
        sort_order,
        mvp_open,
        home_source_type,
        home_source_match_title,
        away_source_type,
        away_source_match_title
      `
      )
      .order("sort_order", { ascending: true });

    if (finalError) {
      console.error("Error cargando eliminatorias:", finalError);
      setMensaje(
        `No se han podido cargar las eliminatorias: ${finalError.message}`
      );
      setLoading(false);
      return;
    }

    const eliminatorias = (finalData ?? []) as FinalMatch[];
    setFinalMatches(eliminatorias);

    const fechas = Array.from(
      new Set(
        [
          ...partidos.map((partido) => partido.match_date),
          ...eliminatorias.map((partido) => partido.match_date),
        ].filter(Boolean) as string[]
      )
    ).sort();

    if (fechas.length > 0) {
      setSelectedDate((actual) => actual || fechas[0]);
    }

    const tipoInicial =
      opciones?.tipoMantener ??
      (partidos.length > 0 ? "grupo" : ("final" as MatchType));

    const idInicial =
      opciones?.idMantener ??
      (tipoInicial === "grupo"
        ? partidos[0]?.id ?? ""
        : eliminatorias[0]?.id ?? "");

    setMatchType(tipoInicial);
    setSelectedId(idInicial);

    if (idInicial) {
      await cargarFicha(tipoInicial, idInicial, equipos, partidos, eliminatorias);
    } else {
      limpiarFicha();
    }

    setLoading(false);
  }

  function obtenerContextoFicha(
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
          local: null as TeamRef | null,
          visitante: null as TeamRef | null,
          estadoFicha: "Pendiente",
          mvpFicha: false,
          scoreLocal: "",
          scoreVisitante: "",
          penLocal: "",
          penVisitante: "",
        };
      }

      return {
        titulo: `${partido.home_team?.name ?? "Local"} vs ${
          partido.away_team?.name ?? "Visitante"
        }`,
        subtitulo: `${formatearFechaSegura(partido.match_date)} · ${
          partido.match_time ?? "Hora pendiente"
        } · ${partido.field ?? "Campo pendiente"}`,
        aviso: "",
        local: partido.home_team,
        visitante: partido.away_team,
        estadoFicha: partido.status ?? "Pendiente",
        mvpFicha: Boolean(partido.mvp_open),
        scoreLocal: partido.home_score?.toString() ?? "",
        scoreVisitante: partido.away_score?.toString() ?? "",
        penLocal: "",
        penVisitante: "",
      };
    }

    const eliminatoria = eliminatorias.find((item) => item.id === id);

    if (!eliminatoria) {
      return {
        titulo: "",
        subtitulo: "",
        aviso: "No se ha encontrado la eliminatoria.",
        local: null as TeamRef | null,
        visitante: null as TeamRef | null,
        estadoFicha: "Pendiente",
        mvpFicha: false,
        scoreLocal: "",
        scoreVisitante: "",
        penLocal: "",
        penVisitante: "",
      };
    }

    const local = equipos.find(
      (team) =>
        normalizarTexto(team.name) === normalizarTexto(eliminatoria.home_ref)
    );

    const visitante = equipos.find(
      (team) =>
        normalizarTexto(team.name) === normalizarTexto(eliminatoria.away_ref)
    );

    const aviso =
      !local || !visitante
        ? "Esta eliminatoria todavía no tiene los dos equipos resueltos. Cuando aparezcan los nombres reales, podrás completar la ficha."
        : "";

    return {
      titulo: `${eliminatoria.home_ref} vs ${eliminatoria.away_ref}`,
      subtitulo: `${eliminatoria.phase} · ${
        eliminatoria.title
      } · ${formatearFechaSegura(eliminatoria.match_date)} · ${
        eliminatoria.match_time ?? "Hora pendiente"
      } · ${eliminatoria.field ?? "Campo pendiente"}`,
      aviso,
      local: local ? { id: local.id, name: local.name } : null,
      visitante: visitante ? { id: visitante.id, name: visitante.name } : null,
      estadoFicha: eliminatoria.status ?? "Pendiente",
      mvpFicha: Boolean(eliminatoria.mvp_open),
      scoreLocal: eliminatoria.home_score?.toString() ?? "",
      scoreVisitante: eliminatoria.away_score?.toString() ?? "",
      penLocal: eliminatoria.home_penalties?.toString() ?? "",
      penVisitante: eliminatoria.away_penalties?.toString() ?? "",
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

    const contexto = obtenerContextoFicha(
      tipo,
      id,
      equiposBase,
      partidosBase,
      eliminatoriasBase
    );

    setFichaTitulo(contexto.titulo);
    setFichaSubtitulo(contexto.subtitulo);
    setFichaAviso(contexto.aviso);
    setHomeTeam(contexto.local);
    setAwayTeam(contexto.visitante);
    setEstado(contexto.estadoFicha);
    setMvpOpen(contexto.mvpFicha);
    setHomeScore(contexto.scoreLocal);
    setAwayScore(contexto.scoreVisitante);
    setHomePenalties(contexto.penLocal);
    setAwayPenalties(contexto.penVisitante);

    const teamIds = [contexto.local?.id, contexto.visitante?.id].filter(
      Boolean
    ) as string[];

    if (teamIds.length === 0) {
      setRows([]);
      setLoadingFicha(false);
      return;
    }

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, team_id, name, number")
      .in("team_id", teamIds)
      .order("number", { ascending: true })
      .order("name", { ascending: true });

    if (playersError) {
      console.error("Error cargando jugadores:", playersError);
      setMensaje(
        `No se han podido cargar los jugadores: ${playersError.message}`
      );
      setLoadingFicha(false);
      return;
    }

    const jugadores = ((playersData ?? []) as Player[]).sort((a, b) => {
      const ordenA = a.team_id === contexto.local?.id ? 0 : 1;
      const ordenB = b.team_id === contexto.local?.id ? 0 : 1;

      if (ordenA !== ordenB) return ordenA - ordenB;

      const dorsalA = a.number ?? 9999;
      const dorsalB = b.number ?? 9999;

      if (dorsalA !== dorsalB) return dorsalA - dorsalB;

      return a.name.localeCompare(b.name);
    });

    const playerIds = jugadores.map((player) => player.id);

    const suspensionRequest =
      playerIds.length > 0
        ? await supabase
            .from("suspensions")
            .select(
              "id, player_id, team_id, match_id, final_match_id, reason, games, served, status, created_at"
            )
            .in("player_id", playerIds)
        : { data: [], error: null };

    if (suspensionRequest.error) {
      console.error("Error cargando sanciones:", suspensionRequest.error);
      setMensaje(
        `No se han podido cargar las sanciones: ${suspensionRequest.error.message}`
      );
      setLoadingFicha(false);
      return;
    }

    const sanciones = ((suspensionRequest.data ?? []) as Suspension[]).filter(
      (suspension) =>
        estadoPendiente(suspension.status) &&
        Math.max(suspension.games - suspension.served, 0) > 0
    );

    function sancionParaJugador(player: Player): SuspensionInfo | null {
      const sancionesJugador = sanciones.filter(
        (suspension) => suspension.player_id === player.id
      );

      for (const suspension of sancionesJugador) {
        const restantes = Math.max(suspension.games - suspension.served, 0);
        if (restantes <= 0) continue;

        const teamName =
          equiposBase.find((team) => team.id === suspension.team_id)?.name ??
          player.team_id;

        const partidosEquipo = partidosEquipoParaSancion(
          suspension.team_id,
          teamName,
          partidosBase,
          eliminatoriasBase
        );

        const origenValor = origenSancionValor(
          suspension,
          partidosBase,
          eliminatoriasBase
        );

        const partidosPendientesDeSancion = partidosEquipo
          .filter((match) => match.dateValue > origenValor)
          .slice(suspension.served, suspension.games);

        const indicePartidoSancion = partidosPendientesDeSancion.findIndex(
          (match) => match.tipo === tipo && match.id === id
        );

        const afectaEstePartido = indicePartidoSancion !== -1;

        if (afectaEstePartido) {
          return {
            id: suspension.id,
            reason: suspension.reason,
            games: suspension.games,
            served: suspension.served,
            restantes,
            partidoActual: Math.min(
              suspension.served + indicePartidoSancion + 1,
              suspension.games
            ),
          };
        }
      }

      return null;
    }

    const columna = columnaPartido(tipo);

    const { data: matchPlayersData, error: matchPlayersError } = await supabase
      .from("match_players")
      .select("id, player_id, team_id")
      .eq(columna, id);

    if (matchPlayersError) {
      console.error("Error cargando participantes:", matchPlayersError);
      setMensaje(
        `No se han podido cargar los jugadores de la ficha: ${matchPlayersError.message}`
      );
      setLoadingFicha(false);
      return;
    }

    const participantes = (matchPlayersData ?? []) as MatchPlayerRow[];

    const { data: goalsData, error: goalsError } = await supabase
      .from("match_goals")
      .select("id, player_id, team_id")
      .eq(columna, id);

    if (goalsError) {
      console.error("Error cargando goles:", goalsError);
      setMensaje(`No se han podido cargar los goles: ${goalsError.message}`);
      setLoadingFicha(false);
      return;
    }

    const goles = (goalsData ?? []) as GoalRow[];

    const { data: cardsData, error: cardsError } = await supabase
      .from("match_cards")
      .select("id, player_id, team_id, card_type")
      .eq(columna, id);

    if (cardsError) {
      console.error("Error cargando tarjetas:", cardsError);
      setMensaje(
        `No se han podido cargar las tarjetas: ${cardsError.message}`
      );
      setLoadingFicha(false);
      return;
    }

    const tarjetas = (cardsData ?? []) as CardRow[];

    const rowsFicha: FichaRow[] = jugadores.map((player) => {
      const sancion = sancionParaJugador(player);

      const played = participantes.some((item) => item.player_id === player.id);
      const goals = goles.filter((item) => item.player_id === player.id).length;
      const yellow = tarjetas.filter(
        (item) => item.player_id === player.id && item.card_type === "yellow"
      ).length;
      const red = tarjetas.filter(
        (item) => item.player_id === player.id && item.card_type === "red"
      ).length;

      if (sancion) {
        return {
          player,
          played: false,
          goals: 0,
          yellow: 0,
          red: 0,
          suspended: true,
          suspensionId: sancion.id,
          suspensionReason: sancion.reason,
          suspensionGames: sancion.games,
          suspensionServed: sancion.served,
          suspensionRestantes: sancion.restantes,
          suspensionPartidoActual: sancion.partidoActual,
        };
      }

      return {
        player,
        played: played || goals > 0 || yellow > 0 || red > 0,
        goals,
        yellow,
        red,
        suspended: false,
        suspensionId: "",
        suspensionReason: "",
        suspensionGames: 0,
        suspensionServed: 0,
        suspensionRestantes: 0,
        suspensionPartidoActual: 0,
      };
    });

    setRows(rowsFicha);
    setLoadingFicha(false);
  }

  async function cambiarTipo(tipo: MatchType) {
    const nuevoId =
      tipo === "grupo" ? groupMatches[0]?.id ?? "" : finalMatches[0]?.id ?? "";

    setMatchType(tipo);
    setSelectedId(nuevoId);
    setMensaje("");

    if (nuevoId) {
      await cargarFicha(tipo, nuevoId);
    } else {
      limpiarFicha();
    }
  }

  async function cambiarPartido(id: string) {
    setSelectedId(id);
    setMensaje("");
    await cargarFicha(matchType, id);
  }

  async function seleccionarPartidoJornada(match: AdminCalendarMatch) {
    setMatchType(match.tipo);
    setSelectedId(match.id);
    setMensaje("");

    await cargarFicha(match.tipo, match.id);

    setTimeout(() => {
      document
        .getElementById("ficha-edicion")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function actualizarJugo(playerId: string, played: boolean) {
    setRows((actuales) =>
      actuales.map((row) =>
        row.player.id === playerId && !row.suspended ? { ...row, played } : row
      )
    );
  }

  function actualizarNumero(
    playerId: string,
    campo: "goals" | "yellow" | "red",
    valor: string
  ) {
    const numero = Number.parseInt(valor, 10);
    const numeroSeguro = Number.isNaN(numero) ? 0 : Math.max(0, numero);

    setRows((actuales) =>
      actuales.map((row) =>
        row.player.id === playerId && !row.suspended
          ? {
              ...row,
              [campo]: numeroSeguro,
              played: numeroSeguro > 0 ? true : row.played,
            }
          : row
      )
    );
  }

  function marcarTodos() {
    setRows((actuales) =>
      actuales.map((row) =>
        row.suspended ? row : { ...row, played: true }
      )
    );
  }

  function limpiarJugadores() {
    setRows((actuales) =>
      actuales.map((row) => ({
        ...row,
        played: false,
        goals: 0,
        yellow: 0,
        red: 0,
      }))
    );
  }

  function golesEquipo(teamId: string | undefined) {
    if (!teamId) return 0;

    return rows.reduce((total, row) => {
      if (row.player.team_id !== teamId) return total;
      return total + row.goals;
    }, 0);
  }

  const golesFichaLocal = golesEquipo(homeTeam?.id);
  const golesFichaVisitante = golesEquipo(awayTeam?.id);

  const calendarMatches = useMemo<AdminCalendarMatch[]>(() => {
    const partidosGrupo: AdminCalendarMatch[] = groupMatches
      .filter((match) => Boolean(match.match_date))
      .map((match, index) => ({
        id: match.id,
        tipo: "grupo",
        phase: "Clasificación",
        title: "Clasificación",
        match_date: match.match_date as string,
        match_time: match.match_time,
        field: match.field,
        home_name: match.home_team?.name ?? "Local",
        away_name: match.away_team?.name ?? "Visitante",
        status: match.status,
        sort_order: index + 1,
      }));

    const partidosFinales: AdminCalendarMatch[] = finalMatches
      .filter((match) => Boolean(match.match_date))
      .map((match) => ({
        id: match.id,
        tipo: "final",
        phase: match.phase,
        title: match.title,
        match_date: match.match_date as string,
        match_time: match.match_time,
        field: match.field,
        home_name: match.home_ref || "Local",
        away_name: match.away_ref || "Visitante",
        status: match.status,
        sort_order: match.sort_order,
      }));

    return ordenarCalendario([...partidosGrupo, ...partidosFinales]);
  }, [groupMatches, finalMatches]);

  const matchesByDate = useMemo(() => {
    const grouped: Record<string, AdminCalendarMatch[]> = {};

    calendarMatches.forEach((match) => {
      if (!grouped[match.match_date]) grouped[match.match_date] = [];
      grouped[match.match_date].push(match);
    });

    Object.keys(grouped).forEach((date) => {
      grouped[date] = ordenarCalendario(grouped[date]);
    });

    return grouped;
  }, [calendarMatches]);

  const calendarMonths = useMemo(() => {
    const uniqueMonths = new Map<string, CalendarMonth>();

    calendarMatches.forEach((match) => {
      const { year, monthIndex } = fechaToParts(match.match_date);
      const key = `${year}-${monthIndex}`;

      uniqueMonths.set(key, { year, monthIndex });
    });

    const result = Array.from(uniqueMonths.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });

    return result.length > 0 ? result : DEFAULT_MONTHS;
  }, [calendarMatches]);

  const monthPositionSeguro = Math.min(
    monthPosition,
    Math.max(calendarMonths.length - 1, 0)
  );

  const currentMonth = calendarMonths[monthPositionSeguro] ?? DEFAULT_MONTHS[0];
  const selectedMatches = selectedDate ? matchesByDate[selectedDate] ?? [] : [];

  function renderMonth(month: CalendarMonth) {
    const firstDay = new Date(month.year, month.monthIndex, 1);
    const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: Array<number | null> = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return (
      <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-3 bg-red-600 px-4 py-4 text-white">
          <button
            onClick={() =>
              setMonthPosition((actual) => Math.max(actual - 1, 0))
            }
            disabled={monthPositionSeguro <= 0}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl font-black disabled:opacity-30"
          >
            ‹
          </button>

          <p className="text-center text-lg font-black capitalize">
            {nombreMes(month.year, month.monthIndex)}
          </p>

          <button
            onClick={() =>
              setMonthPosition((actual) =>
                Math.min(actual + 1, calendarMonths.length - 1)
              )
            }
            disabled={monthPositionSeguro >= calendarMonths.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl font-black disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-7 gap-1 px-1 pb-2 text-center text-xs font-black uppercase text-slate-400">
            {WEEK_DAYS.map((day) => (
              <p key={day}>{day}</p>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-[58px]" />;
              }

              const date = fechaDesdeParts(month.year, month.monthIndex, day);
              const dayMatches = matchesByDate[date] ?? [];
              const hasMatches = dayMatches.length > 0;
              const selected = selectedDate === date;

              return (
                <button
                  key={date}
                  onClick={() => {
                    if (hasMatches) setSelectedDate(date);
                  }}
                  disabled={!hasMatches}
                  className={`min-h-[58px] rounded-2xl p-1 text-left shadow-sm transition ${
                    selected
                      ? "bg-red-600 text-white"
                      : hasMatches
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <p className="text-sm font-black">{day}</p>

                  {hasMatches ? (
                    <p
                      className={`mt-1 text-[10px] font-black leading-tight ${
                        selected ? "text-red-100" : "text-red-300"
                      }`}
                    >
                      {dayMatches.length} partido
                      {dayMatches.length === 1 ? "" : "s"}
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] font-bold">—</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  async function actualizarArrastresFinales() {
    const { data, error } = await supabase
      .from("final_matches")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error actualizando arrastres:", error);
      return;
    }

    let lista = (data ?? []) as FinalMatch[];

    function resolver(
      matchTitle: string | null | undefined,
      tipo: "winner" | "loser"
    ) {
      if (!matchTitle) return "";

      const origen = lista.find((match) => match.title === matchTitle);

      if (!origen) {
        return `${tipo === "winner" ? "Ganador" : "Perdedor"} ${matchTitle}`;
      }

      if (origen.home_score === null || origen.away_score === null) {
        return `${tipo === "winner" ? "Ganador" : "Perdedor"} ${matchTitle}`;
      }

      let ganaLocal: boolean | null = null;

      if (origen.home_score > origen.away_score) {
        ganaLocal = true;
      } else if (origen.home_score < origen.away_score) {
        ganaLocal = false;
      } else if (
        origen.home_penalties !== null &&
        origen.away_penalties !== null &&
        origen.home_penalties !== origen.away_penalties
      ) {
        ganaLocal = origen.home_penalties > origen.away_penalties;
      }

      if (ganaLocal === null) {
        return `${tipo === "winner" ? "Ganador" : "Perdedor"} ${matchTitle}`;
      }

      if (tipo === "winner") {
        return ganaLocal ? origen.home_ref : origen.away_ref;
      }

      return ganaLocal ? origen.away_ref : origen.home_ref;
    }

    for (let vuelta = 0; vuelta < 5; vuelta++) {
      lista = lista.map((match) => ({
        ...match,
        home_ref:
          match.home_source_type === "winner"
            ? resolver(match.home_source_match_title, "winner")
            : match.home_source_type === "loser"
            ? resolver(match.home_source_match_title, "loser")
            : match.home_ref,
        away_ref:
          match.away_source_type === "winner"
            ? resolver(match.away_source_match_title, "winner")
            : match.away_source_type === "loser"
            ? resolver(match.away_source_match_title, "loser")
            : match.away_ref,
      }));
    }

    for (const match of lista) {
      const { error: updateError } = await supabase
        .from("final_matches")
        .update({
          home_ref: match.home_ref,
          away_ref: match.away_ref,
        })
        .eq("id", match.id);

      if (updateError) {
        console.error("Error actualizando cruce:", updateError);
        return;
      }
    }
  }

  async function crearSancionesPorAcumulacionAmarillas() {
    if (!selectedId) return null;

    const jugadoresRevisar = rows
      .filter((row) => !row.suspended)
      .map((row) => row.player);

    if (jugadoresRevisar.length === 0) return null;

    const playerIds = Array.from(
      new Set(jugadoresRevisar.map((player) => player.id))
    );

    const { data: cardsData, error: cardsError } = await supabase
      .from("match_cards")
      .select("id, player_id, card_type")
      .in("player_id", playerIds)
      .eq("card_type", "yellow");

    if (cardsError) {
      console.error("Error revisando amarillas acumuladas:", cardsError);
      return cardsError.message;
    }

    const { data: existingSuspensionsData, error: suspensionsError } =
      await supabase
        .from("suspensions")
        .select("id, player_id, reason")
        .in("player_id", playerIds)
        .eq("reason", "Acumulación de amarillas");

    if (suspensionsError) {
      console.error("Error revisando sanciones acumuladas:", suspensionsError);
      return suspensionsError.message;
    }

    const amarillas = (cardsData ?? []) as Array<{
      id: string;
      player_id: string;
      card_type: string;
    }>;

    const sancionesExistentes = (existingSuspensionsData ?? []) as Array<{
      id: string;
      player_id: string;
      reason: string;
    }>;

    const nuevasSanciones: Array<
      MatchPayload & {
        player_id: string;
        team_id: string;
        reason: string;
        games: number;
        served: number;
        status: string;
        created_at: string;
      }
    > = [];

    jugadoresRevisar.forEach((player) => {
      const totalAmarillas = amarillas.filter(
        (card) => card.player_id === player.id
      ).length;

      const sancionesNecesarias = Math.floor(totalAmarillas / 2);

      const sancionesYaCreadas = sancionesExistentes.filter(
        (suspension) => suspension.player_id === player.id
      ).length;

      const sancionesPendientesDeCrear = Math.max(
        sancionesNecesarias - sancionesYaCreadas,
        0
      );

      for (let i = 0; i < sancionesPendientesDeCrear; i++) {
        nuevasSanciones.push({
          ...payloadPartido(matchType, selectedId),
          player_id: player.id,
          team_id: player.team_id,
          reason: "Acumulación de amarillas",
          games: 1,
          served: 0,
          status: "Activa",
          created_at: new Date().toISOString(),
        });
      }
    });

    if (nuevasSanciones.length === 0) return null;

    const { error } = await supabase.from("suspensions").insert(nuevasSanciones);

    if (error) {
      console.error("Error creando sanciones por acumulación:", error);
      return error.message;
    }

    return null;
  }

  async function registrarCumplimientoSanciones() {
    if (!selectedId) return null;

    if (!estadoCuentaComoCumplido(estado)) {
      return null;
    }

    const sancionadosFicha = rows.filter(
      (row) => row.suspended && row.suspensionId
    );

    if (sancionadosFicha.length === 0) return null;

    for (const row of sancionadosFicha) {
      const servedPayload =
        matchType === "grupo"
          ? {
              suspension_id: row.suspensionId,
              match_id: selectedId,
              final_match_id: null,
            }
          : {
              suspension_id: row.suspensionId,
              match_id: null,
              final_match_id: selectedId,
            };

      const checkQuery = supabase
        .from("suspension_served_matches")
        .select("id")
        .eq("suspension_id", row.suspensionId)
        .limit(1);

      const { data: alreadyServed, error: checkError } =
        matchType === "grupo"
          ? await checkQuery.eq("match_id", selectedId)
          : await checkQuery.eq("final_match_id", selectedId);

      if (checkError) {
        console.error("Error comprobando cumplimiento de sanción:", checkError);
        return checkError.message;
      }

      if ((alreadyServed ?? []).length > 0) {
        continue;
      }

      const { error: insertError } = await supabase
        .from("suspension_served_matches")
        .insert(servedPayload);

      if (insertError) {
        console.error("Error registrando partido cumplido:", insertError);
        return insertError.message;
      }

      const { data: suspensionActual, error: readError } = await supabase
        .from("suspensions")
        .select("games, served")
        .eq("id", row.suspensionId)
        .single();

      if (readError || !suspensionActual) {
        console.error("Error leyendo sanción actual:", readError);
        return readError?.message ?? "No se ha podido leer la sanción.";
      }

      const gamesActuales = Number(
        suspensionActual.games ?? row.suspensionGames
      );
      const servedActual = Number(suspensionActual.served ?? 0);

      const nuevoServed = Math.min(servedActual + 1, gamesActuales);
      const nuevoStatus = nuevoServed >= gamesActuales ? "Cumplida" : "Activa";

      const { error: updateError } = await supabase
        .from("suspensions")
        .update({
          served: nuevoServed,
          status: nuevoStatus,
        })
        .eq("id", row.suspensionId);

      if (updateError) {
        console.error("Error actualizando sanción cumplida:", updateError);
        return updateError.message;
      }
    }

    return null;
  }

  async function guardarFichaCompleta() {
    if (!selectedId) {
      setMensaje("Selecciona un partido.");
      return;
    }

    if (!homeTeam || !awayTeam) {
      setMensaje("El partido todavía no tiene los dos equipos resueltos.");
      return;
    }

    const sancionadoConDatos = rows.find(
      (row) =>
        row.suspended &&
        (row.played || row.goals > 0 || row.yellow > 0 || row.red > 0)
    );

    if (sancionadoConDatos) {
      setMensaje(
        `${jugadorNombre(
          sancionadoConDatos.player
        )} está sancionado y no puede tener datos en esta ficha.`
      );
      return;
    }

    const marcadorLocal = numeroDesdeInput(homeScore);
    const marcadorVisitante = numeroDesdeInput(awayScore);

    if (
      (marcadorLocal === null && marcadorVisitante !== null) ||
      (marcadorLocal !== null && marcadorVisitante === null)
    ) {
      setMensaje("Indica los goles de los dos equipos o deja ambos vacíos.");
      return;
    }

    if (marcadorLocal !== null && marcadorLocal < 0) {
      setMensaje("Los goles del equipo local no pueden ser negativos.");
      return;
    }

    if (marcadorVisitante !== null && marcadorVisitante < 0) {
      setMensaje("Los goles del equipo visitante no pueden ser negativos.");
      return;
    }

    const penLocal = numeroDesdeInput(homePenalties);
    const penVisitante = numeroDesdeInput(awayPenalties);

    if (matchType === "final") {
      if (
        (penLocal === null && penVisitante !== null) ||
        (penLocal !== null && penVisitante === null)
      ) {
        setMensaje(
          "Si indicas penaltis, debes poner los penaltis de los dos equipos."
        );
        return;
      }

      if (
        (marcadorLocal === null || marcadorVisitante === null) &&
        (penLocal !== null || penVisitante !== null)
      ) {
        setMensaje("Solo puedes indicar penaltis cuando hay marcador.");
        return;
      }

      if (
        penLocal !== null &&
        penVisitante !== null &&
        marcadorLocal !== null &&
        marcadorVisitante !== null &&
        marcadorLocal !== marcadorVisitante
      ) {
        setMensaje("Solo debe haber penaltis si el partido acaba empatado.");
        return;
      }

      if (
        penLocal !== null &&
        penVisitante !== null &&
        marcadorLocal !== null &&
        marcadorVisitante !== null &&
        marcadorLocal === marcadorVisitante &&
        penLocal === penVisitante
      ) {
        setMensaje("Los penaltis no pueden quedar empatados.");
        return;
      }
    }

    setSaving(true);
    setMensaje("");

    const columna = columnaPartido(matchType);

    const deletePlayers = await supabase
      .from("match_players")
      .delete()
      .eq(columna, selectedId);

    if (deletePlayers.error) {
      console.error("Error borrando jugadores ficha:", deletePlayers.error);
      setMensaje(
        `No se han podido actualizar los jugadores: ${deletePlayers.error.message}`
      );
      setSaving(false);
      return;
    }

    const deleteGoals = await supabase
      .from("match_goals")
      .delete()
      .eq(columna, selectedId);

    if (deleteGoals.error) {
      console.error("Error borrando goles:", deleteGoals.error);
      setMensaje(
        `No se han podido actualizar los goles: ${deleteGoals.error.message}`
      );
      setSaving(false);
      return;
    }

    const deleteCards = await supabase
      .from("match_cards")
      .delete()
      .eq(columna, selectedId);

    if (deleteCards.error) {
      console.error("Error borrando tarjetas:", deleteCards.error);
      setMensaje(
        `No se han podido actualizar las tarjetas: ${deleteCards.error.message}`
      );
      setSaving(false);
      return;
    }

    const deleteAutoSuspensions = await supabase
      .from("suspensions")
      .delete()
      .eq(columna, selectedId)
      .eq("reason", "Tarjeta roja");

    if (deleteAutoSuspensions.error) {
      console.error(
        "Error borrando sanciones automáticas:",
        deleteAutoSuspensions.error
      );
      setMensaje(
        `No se han podido actualizar las sanciones: ${deleteAutoSuspensions.error.message}`
      );
      setSaving(false);
      return;
    }

    const deleteAutoYellowSuspensions = await supabase
      .from("suspensions")
      .delete()
      .eq(columna, selectedId)
      .eq("reason", "Acumulación de amarillas");

    if (deleteAutoYellowSuspensions.error) {
      console.error(
        "Error borrando sanciones por acumulación:",
        deleteAutoYellowSuspensions.error
      );
      setMensaje(
        `No se han podido actualizar las sanciones por amarillas: ${deleteAutoYellowSuspensions.error.message}`
      );
      setSaving(false);
      return;
    }

    const filasJugadores = rows
      .filter(
        (row) =>
          !row.suspended &&
          (row.played || row.goals > 0 || row.yellow > 0 || row.red > 0)
      )
      .map((row) => ({
        ...payloadPartido(matchType, selectedId),
        player_id: row.player.id,
        team_id: row.player.team_id,
        played: true,
      }));

    if (filasJugadores.length > 0) {
      const { error } = await supabase
        .from("match_players")
        .insert(filasJugadores);

      if (error) {
        console.error("Error insertando jugadores:", error);
        setMensaje(`No se han podido guardar los jugadores: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    const filasGoles: Array<
      MatchPayload & {
        player_id: string;
        team_id: string;
        minute: null;
      }
    > = [];

    rows.forEach((row) => {
      if (row.suspended) return;

      for (let i = 0; i < row.goals; i++) {
        filasGoles.push({
          ...payloadPartido(matchType, selectedId),
          player_id: row.player.id,
          team_id: row.player.team_id,
          minute: null,
        });
      }
    });

    if (filasGoles.length > 0) {
      const { error } = await supabase.from("match_goals").insert(filasGoles);

      if (error) {
        console.error("Error insertando goles:", error);
        setMensaje(`No se han podido guardar los goles: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    const filasTarjetas: Array<
      MatchPayload & {
        player_id: string;
        team_id: string;
        card_type: "yellow" | "red";
        minute: null;
      }
    > = [];

    rows.forEach((row) => {
      if (row.suspended) return;

      for (let i = 0; i < row.yellow; i++) {
        filasTarjetas.push({
          ...payloadPartido(matchType, selectedId),
          player_id: row.player.id,
          team_id: row.player.team_id,
          card_type: "yellow",
          minute: null,
        });
      }

      for (let i = 0; i < row.red; i++) {
        filasTarjetas.push({
          ...payloadPartido(matchType, selectedId),
          player_id: row.player.id,
          team_id: row.player.team_id,
          card_type: "red",
          minute: null,
        });
      }
    });

    if (filasTarjetas.length > 0) {
      const { error } = await supabase
        .from("match_cards")
        .insert(filasTarjetas);

      if (error) {
        console.error("Error insertando tarjetas:", error);
        setMensaje(`No se han podido guardar las tarjetas: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    const errorAcumulacion = await crearSancionesPorAcumulacionAmarillas();

    if (errorAcumulacion) {
      setMensaje(
        `Las tarjetas se guardaron, pero no se pudo revisar la acumulación de amarillas: ${errorAcumulacion}`
      );
      setSaving(false);
      return;
    }

    const filasSanciones = rows
      .filter((row) => !row.suspended && row.red > 0)
      .map((row) => ({
        ...payloadPartido(matchType, selectedId),
        player_id: row.player.id,
        team_id: row.player.team_id,
        reason: "Tarjeta roja",
        games: 1,
        served: 0,
        status: "Activa",
        created_at: new Date().toISOString(),
      }));

    if (filasSanciones.length > 0) {
      const { error } = await supabase
        .from("suspensions")
        .insert(filasSanciones);

      if (error) {
        console.error("Error insertando sanciones:", error);
        setMensaje(`No se han podido guardar las sanciones: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    const updatePayload: Record<string, string | number | boolean | null> = {
      home_score: marcadorLocal,
      away_score: marcadorVisitante,
      status: estado,
      mvp_open: mvpOpen,
    };

    if (matchType === "final") {
      updatePayload.home_penalties = penLocal;
      updatePayload.away_penalties = penVisitante;
    }

    const tablaPartido = matchType === "grupo" ? "matches" : "final_matches";

    const { error: updateError } = await supabase
      .from(tablaPartido)
      .update(updatePayload)
      .eq("id", selectedId);

    if (updateError) {
      console.error("Error actualizando resultado:", updateError);
      setMensaje(
        `La ficha se guardó, pero no se actualizó el resultado: ${updateError.message}`
      );
      setSaving(false);
      return;
    }

    if (matchType === "final") {
      await actualizarArrastresFinales();
    }

    const errorCumplimiento = await registrarCumplimientoSanciones();

    if (errorCumplimiento) {
      setMensaje(
        `La ficha se guardó, pero no se pudo actualizar el cumplimiento de sanciones: ${errorCumplimiento}`
      );
      setSaving(false);
      return;
    }

    await cargarDatos({
      tipoMantener: matchType,
      idMantener: selectedId,
    });

    setMensaje(
      "Ficha, marcador, tarjetas y sanciones guardados correctamente."
    );
    setSaving(false);
  }

  const partidosDisponibles = matchType === "grupo" ? groupMatches : finalMatches;

  const mensajeCorrecto =
    mensaje.includes("correctamente") ||
    mensaje.includes("guardad") ||
    mensaje.includes("actualizad");

  return (
    <AdminGuard>
      <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
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
              Marcador, jugadores, goles, tarjetas y sanciones
            </p>
          </div>

          <Link
            href="/admin"
            className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
          >
            Volver al panel admin
          </Link>

          {mensaje && (
            <div
              className={`mt-4 rounded-2xl p-4 text-sm font-bold shadow ${
                mensajeCorrecto
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {mensaje}
            </div>
          )}

          {loading ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Cargando fichas...
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {renderMonth(currentMonth)}

              <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
                <div className="bg-slate-950 px-5 py-4 text-center text-white">
                  <p className="text-sm font-black uppercase tracking-widest text-red-300">
                    Jornada del
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    {selectedDate ? formatearJornada(selectedDate) : "Sin fecha"}
                  </h2>
                </div>

                <div className="p-4">
                  {selectedMatches.length === 0 ? (
                    <p className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                      Toca un día con partidos para ver la jornada.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedMatches.map((match) => {
                        const seleccionado =
                          match.tipo === matchType && match.id === selectedId;

                        return (
                          <div
                            key={`${match.tipo}-${match.id}`}
                            className={`rounded-2xl p-4 shadow-sm ${
                              seleccionado
                                ? "border-2 border-red-500 bg-red-50"
                                : "bg-slate-100"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black uppercase tracking-widest text-red-600">
                                  {match.tipo === "final"
                                    ? `${match.phase} · ${match.title}`
                                    : "Clasificación"}
                                </p>

                                <p className="mt-2 break-words text-lg font-black leading-tight">
                                  {match.home_name} vs {match.away_name}
                                </p>

                                <p className="mt-2 text-xs font-bold text-slate-500">
                                  {match.match_time ?? "Hora pendiente"} ·{" "}
                                  {match.field ?? "Campo pendiente"} ·{" "}
                                  {match.status ?? "Pendiente"}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => seleccionarPartidoJornada(match)}
                              className={`mt-3 w-full rounded-xl py-3 text-sm font-black shadow ${
                                seleccionado
                                  ? "bg-slate-950 text-white"
                                  : "bg-red-600 text-white"
                              }`}
                            >
                              {seleccionado
                                ? "Ficha seleccionada"
                                : "Modificar ficha"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

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
                <div id="ficha-edicion" className="space-y-5">
                  <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
                    <div className="bg-red-600 px-5 py-4 text-white">
                      <p className="text-sm font-black uppercase tracking-widest">
                        Partido seleccionado
                      </p>

                      <h2 className="mt-2 text-2xl font-black leading-tight">
                        {fichaTitulo}
                      </h2>

                      <p className="mt-2 text-sm font-bold text-red-100">
                        {fichaSubtitulo}
                      </p>
                    </div>

                    <div className="p-5">
                      {fichaAviso && (
                        <div className="mb-4 rounded-2xl bg-yellow-100 p-4 text-sm font-bold text-yellow-900">
                          {fichaAviso}
                        </div>
                      )}

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="text-center">
                          <p className="text-sm font-black leading-tight">
                            {homeTeam?.name ?? "Local"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-white shadow">
                          <p className="text-4xl font-black">
                            {homeScore.trim() === "" ? "-" : homeScore} -{" "}
                            {awayScore.trim() === "" ? "-" : awayScore}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-sm font-black leading-tight">
                            {awayTeam?.name ?? "Visitante"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                        <p className="text-sm font-black uppercase text-slate-500">
                          Marcador manual
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            min="0"
                            value={homeScore}
                            onChange={(event) =>
                              setHomeScore(event.target.value)
                            }
                            placeholder="Goles local"
                            className="rounded-xl border border-slate-300 p-3 text-center text-2xl font-black"
                          />

                          <input
                            type="number"
                            min="0"
                            value={awayScore}
                            onChange={(event) =>
                              setAwayScore(event.target.value)
                            }
                            placeholder="Goles visitante"
                            className="rounded-xl border border-slate-300 p-3 text-center text-2xl font-black"
                          />
                        </div>

                        <p className="mt-3 text-xs font-bold text-slate-500">
                          Goles apuntados a jugadores: {golesFichaLocal} -{" "}
                          {golesFichaVisitante}. Este dato sirve para la Bota de
                          Oro, pero el resultado oficial es el marcador manual.
                        </p>
                      </div>

                      <div className="mt-5">
                        <label className="text-sm font-black uppercase text-slate-500">
                          Estado del partido
                        </label>

                        <select
                          value={estado}
                          onChange={(event) => setEstado(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                        >
                          <option>Pendiente</option>
                          <option>En juego</option>
                          <option>Finalizado</option>
                          <option>Cerrado</option>
                        </select>
                      </div>

                      {matchType === "final" && (
                        <div className="mt-4 rounded-2xl bg-slate-100 p-4">
                          <p className="text-sm font-black uppercase text-slate-500">
                            Penaltis si hay empate
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <input
                              type="number"
                              min="0"
                              value={homePenalties}
                              onChange={(event) =>
                                setHomePenalties(event.target.value)
                              }
                              placeholder="Pen. local"
                              className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                            />

                            <input
                              type="number"
                              min="0"
                              value={awayPenalties}
                              onChange={(event) =>
                                setAwayPenalties(event.target.value)
                              }
                              placeholder="Pen. visitante"
                              className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                            />
                          </div>
                        </div>
                      )}

                      <label className="mt-4 flex items-center justify-between rounded-2xl bg-slate-100 p-4 font-black">
                        <span>Abrir votación MVP</span>

                        <input
                          type="checkbox"
                          checked={mvpOpen}
                          onChange={(event) => setMvpOpen(event.target.checked)}
                          className="h-6 w-6"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                        Ficha rápida
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        Marca quién juega y apunta goles, amarillas y rojas.
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        onClick={marcarTodos}
                        className="rounded-xl bg-slate-900 py-3 text-sm font-black text-white shadow"
                      >
                        Marcar todos
                      </button>

                      <button
                        onClick={limpiarJugadores}
                        className="rounded-xl bg-slate-200 py-3 text-sm font-black text-slate-900 shadow"
                      >
                        Limpiar ficha
                      </button>
                    </div>

                    {rows.length === 0 ? (
                      <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                        No hay jugadores disponibles para esta ficha.
                      </p>
                    ) : (
                      <div className="mt-5 space-y-4">
                        {rows.map((row) => (
                          <div
                            key={row.player.id}
                            className={`rounded-2xl p-4 shadow-sm ${
                              row.suspended
                                ? "border-2 border-red-200 bg-red-50"
                                : "bg-slate-100"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-black leading-tight">
                                  {jugadorNombre(row.player)}
                                </p>
                                <p className="text-sm font-bold text-slate-500">
                                  {nombreEquipo(row.player.team_id)}
                                </p>
                              </div>

                              <label
                                className={`flex flex-col items-center gap-1 text-xs font-black uppercase ${
                                  row.suspended
                                    ? "text-red-500"
                                    : "text-slate-500"
                                }`}
                              >
                                {row.suspended ? "Sancionado" : "Jugó"}
                                <input
                                  type="checkbox"
                                  checked={row.played}
                                  disabled={row.suspended}
                                  onChange={(event) =>
                                    actualizarJugo(
                                      row.player.id,
                                      event.target.checked
                                    )
                                  }
                                  className="h-6 w-6 disabled:opacity-40"
                                />
                              </label>
                            </div>

                            {row.suspended && (
                              <div className="mt-3 rounded-xl bg-red-100 p-3 text-sm font-bold text-red-800">
                                <p className="font-black">
                                  Sancionado para este partido
                                </p>

                                <p className="mt-1">
                                  {row.suspensionReason} · Partido{" "}
                                  {row.suspensionPartidoActual} de{" "}
                                  {row.suspensionGames} de sanción
                                </p>
                              </div>
                            )}

                            <div className="mt-4 grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-xs font-black uppercase text-slate-500">
                                  Goles
                                </label>

                                <select
                                  value={row.goals}
                                  disabled={row.suspended}
                                  onChange={(event) =>
                                    actualizarNumero(
                                      row.player.id,
                                      "goals",
                                      event.target.value
                                    )
                                  }
                                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-center text-lg font-black disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                  {opcionesNumero(10).map((numero) => (
                                    <option key={numero} value={numero}>
                                      {numero}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-black uppercase text-slate-500">
                                  Amar.
                                </label>

                                <select
                                  value={row.yellow}
                                  disabled={row.suspended}
                                  onChange={(event) =>
                                    actualizarNumero(
                                      row.player.id,
                                      "yellow",
                                      event.target.value
                                    )
                                  }
                                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-center text-lg font-black disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                  {opcionesNumero(2).map((numero) => (
                                    <option key={numero} value={numero}>
                                      {numero}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-black uppercase text-slate-500">
                                  Rojas
                                </label>

                                <select
                                  value={row.red}
                                  disabled={row.suspended}
                                  onChange={(event) =>
                                    actualizarNumero(
                                      row.player.id,
                                      "red",
                                      event.target.value
                                    )
                                  }
                                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-center text-lg font-black disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                  {opcionesNumero(1).map((numero) => (
                                    <option key={numero} value={numero}>
                                      {numero}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={guardarFichaCompleta}
                    disabled={saving}
                    className="w-full rounded-2xl bg-red-600 py-4 text-lg font-black text-white shadow-2xl disabled:opacity-60"
                  >
                    {saving ? "Guardando ficha..." : "Guardar ficha y marcador"}
                  </button>
                </div>
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