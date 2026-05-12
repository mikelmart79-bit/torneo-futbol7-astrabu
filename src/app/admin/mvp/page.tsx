"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type MatchType = "grupo" | "final";

type Team = {
  id: string;
  name: string;
};

type TeamRef = {
  id: string;
  name: string;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
};

type Vote = {
  id: string;
  match_id: string | null;
  final_match_id: string | null;
  player_id: string;
  user_id: string;
  team_id: string | null;
};

type MvpNominee = {
  id: string;
  match_id: string | null;
  final_match_id: string | null;
  player_id: string;
  team_id: string | null;
};

type RawGroupMatch = {
  id: string;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  mvp_open: boolean | null;
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
  home_source_type: string | null;
  home_source_match_title: string | null;
  away_source_type: string | null;
  away_source_match_title: string | null;
};

type AdminMvpMatch = {
  id: string;
  tipo: MatchType;
  phaseLabel: string;
  title: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_name: string;
  away_name: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  mvp_open: boolean | null;
  sort_order: number;
};

type RankingRow = {
  player_id: string;
  player_name: string;
  player_number: number | null;
  team_name: string;
  votes: number;
  percentage: number;
  isNominee: boolean;
};

type CalendarMonth = {
  year: number;
  monthIndex: number;
};

const ORDEN_FASES = [
  "Clasificación",
  "Octavos",
  "Cuartos",
  "Semifinales",
  "Tercer puesto",
  "Final",
];

const DEFAULT_MONTHS: CalendarMonth[] = [
  { year: 2026, monthIndex: 6 },
  { year: 2026, monthIndex: 7 },
];

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function buscarEquipoPorNombre(
  equipos: Team[],
  nombre: string | null | undefined
): TeamRef | null {
  const equipo = equipos.find(
    (team) => normalizarTexto(team.name) === normalizarTexto(nombre)
  );

  return equipo ? { id: equipo.id, name: equipo.name } : null;
}

function tipoReferenciaEliminatoria(
  sourceType: string | null | undefined,
  referencia: string | null | undefined
): "winner" | "loser" | null {
  const tipo = normalizarTexto(sourceType);
  const ref = normalizarTexto(referencia);

  if (tipo === "winner" || tipo === "ganador") return "winner";
  if (tipo === "loser" || tipo === "perdedor") return "loser";

  if (ref.startsWith("ganador ")) return "winner";
  if (ref.startsWith("perdedor ")) return "loser";

  return null;
}

function tituloReferenciaEliminatoria(
  sourceMatchTitle: string | null | undefined,
  referencia: string | null | undefined
) {
  if (sourceMatchTitle && sourceMatchTitle.trim() !== "") {
    return sourceMatchTitle.trim();
  }

  const ref = (referencia ?? "").trim();

  const ganador = ref.match(/^ganador\s+(.+)$/i);
  if (ganador?.[1]) return ganador[1].trim();

  const perdedor = ref.match(/^perdedor\s+(.+)$/i);
  if (perdedor?.[1]) return perdedor[1].trim();

  return "";
}

function resolverEquipoDesdeReferencia(
  referencia: string | null | undefined,
  sourceType: string | null | undefined,
  sourceMatchTitle: string | null | undefined,
  equipos: Team[],
  eliminatorias: FinalMatch[],
  visitados = new Set<string>()
): TeamRef | null {
  const directo = buscarEquipoPorNombre(equipos, referencia);

  if (directo) return directo;

  const tipo = tipoReferenciaEliminatoria(sourceType, referencia);
  const tituloOrigen = tituloReferenciaEliminatoria(
    sourceMatchTitle,
    referencia
  );

  if (!tipo || !tituloOrigen) return null;

  const origen = eliminatorias.find(
    (match) => normalizarTexto(match.title) === normalizarTexto(tituloOrigen)
  );

  if (!origen) return null;
  if (visitados.has(origen.id)) return null;

  visitados.add(origen.id);

  if (origen.home_score === null || origen.away_score === null) {
    return null;
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

  if (ganaLocal === null) return null;

  const usarLocal = tipo === "winner" ? ganaLocal : !ganaLocal;

  const siguienteReferencia = usarLocal ? origen.home_ref : origen.away_ref;
  const siguienteSourceType = usarLocal
    ? origen.home_source_type
    : origen.away_source_type;
  const siguienteSourceMatchTitle = usarLocal
    ? origen.home_source_match_title
    : origen.away_source_match_title;

  return resolverEquipoDesdeReferencia(
    siguienteReferencia,
    siguienteSourceType,
    siguienteSourceMatchTitle,
    equipos,
    eliminatorias,
    visitados
  );
}

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

function estadoBonito(status: string | null) {
  if (!status) return "Pendiente";

  if (status === "pending") return "Pendiente";
  if (status === "live") return "En juego";
  if (status === "finished") return "Finalizado";
  if (status === "closed") return "Cerrado";

  return status;
}

function normalizarFase(fase: string) {
  if (fase === "Tercer Y cuarto puesto") return "Tercer puesto";
  if (fase === "Tercer y cuarto puesto") return "Tercer puesto";
  return fase;
}

function ordenarPartidos(partidos: AdminMvpMatch[]) {
  return [...partidos].sort((a, b) => {
    const faseA = ORDEN_FASES.indexOf(a.phaseLabel);
    const faseB = ORDEN_FASES.indexOf(b.phaseLabel);

    if (faseA !== faseB) {
      if (faseA === -1) return 1;
      if (faseB === -1) return -1;
      return faseA - faseB;
    }

    const fechaA = a.match_date ?? "9999-12-31";
    const fechaB = b.match_date ?? "9999-12-31";

    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);

    const horaA = a.match_time ?? "99:99";
    const horaB = b.match_time ?? "99:99";

    if (horaA !== horaB) return horaA.localeCompare(horaB);

    return a.sort_order - b.sort_order;
  });
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

function formatearJornada(fecha: string) {
  const [year, month, day] = fecha.split("-");

  return `${day}/${month}/${year.slice(2)}`;
}

function scrollToElement(elementId: string) {
  setTimeout(() => {
    document
      .getElementById(elementId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

export default function AdminMvpPage() {
  const [matches, setMatches] = useState<AdminMvpMatch[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [nominees, setNominees] = useState<MvpNominee[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [candidateDraftIds, setCandidateDraftIds] = useState<string[]>([]);
  const [selectorCandidatosAbierto, setSelectorCandidatosAbierto] =
    useState(false);
  const [equipoAcordeonAbierto, setEquipoAcordeonAbierto] = useState<
    "home" | "away" | null
  >(null);
  const [monthPosition, setMonthPosition] = useState(0);

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMatch = useMemo(() => {
    return matches.find((match) => match.id === selectedMatchId) ?? null;
  }, [matches, selectedMatchId]);

  const selectedNominees = useMemo(() => {
    if (!selectedMatch) return [];

    return nominees.filter((nominee) => {
      if (selectedMatch.tipo === "final") {
        return nominee.final_match_id === selectedMatch.id;
      }

      return nominee.match_id === selectedMatch.id;
    });
  }, [nominees, selectedMatch]);

  useEffect(() => {
    setCandidateDraftIds(selectedNominees.map((nominee) => nominee.player_id));
  }, [selectedMatchId, selectedNominees]);

  const votosPartido = useMemo(() => {
    if (!selectedMatch) return [];

    return votes.filter((vote) => {
      if (selectedMatch.tipo === "final") {
        return vote.final_match_id === selectedMatch.id;
      }

      return vote.match_id === selectedMatch.id;
    });
  }, [votes, selectedMatch]);

  const totalVotos = votosPartido.length;
  const votantesUnicos = new Set(votosPartido.map((vote) => vote.user_id)).size;

  const equiposPartidoResueltos = Boolean(
    selectedMatch?.home_team_id && selectedMatch?.away_team_id
  );

  const jugadoresLocal = useMemo(() => {
    if (!selectedMatch?.home_team_id) return [];

    return players.filter(
      (player) => player.team_id === selectedMatch.home_team_id
    );
  }, [players, selectedMatch]);

  const jugadoresVisitante = useMemo(() => {
    if (!selectedMatch?.away_team_id) return [];

    return players.filter(
      (player) => player.team_id === selectedMatch.away_team_id
    );
  }, [players, selectedMatch]);

  const totalCandidatos = candidateDraftIds.length;

  const hayCambiosCandidatos =
    candidateDraftIds.slice().sort().join("|") !==
    selectedNominees
      .map((nominee) => nominee.player_id)
      .sort()
      .join("|");

  const puedeReiniciarVotacion =
    totalCandidatos === 0 &&
    (selectedNominees.length > 0 ||
      totalVotos > 0 ||
      Boolean(selectedMatch?.mvp_open));

  const matchesByDate = useMemo(() => {
    const grouped: Record<string, AdminMvpMatch[]> = {};

    matches.forEach((match) => {
      if (!match.match_date) return;

      if (!grouped[match.match_date]) grouped[match.match_date] = [];
      grouped[match.match_date].push(match);
    });

    Object.keys(grouped).forEach((date) => {
      grouped[date] = ordenarPartidos(grouped[date]);
    });

    return grouped;
  }, [matches]);

  const calendarMonths = useMemo(() => {
    const uniqueMonths = new Map<string, CalendarMonth>();

    matches.forEach((match) => {
      if (!match.match_date) return;

      const { year, monthIndex } = fechaToParts(match.match_date);
      const key = `${year}-${monthIndex}`;

      uniqueMonths.set(key, { year, monthIndex });
    });

    const result = Array.from(uniqueMonths.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });

    return result.length > 0 ? result : DEFAULT_MONTHS;
  }, [matches]);

  const monthPositionSeguro = Math.min(
    monthPosition,
    Math.max(calendarMonths.length - 1, 0)
  );

  const currentMonth = calendarMonths[monthPositionSeguro] ?? DEFAULT_MONTHS[0];

  const selectedMatches = selectedDate
    ? matchesByDate[selectedDate] ?? []
    : matches.filter((match) => !match.match_date);

  const ranking = useMemo(() => {
    const teamMap = new Map(teams.map((team) => [team.id, team.name]));
    const playerMap = new Map(players.map((player) => [player.id, player]));
    const nomineeSet = new Set(selectedNominees.map((item) => item.player_id));

    const contador: Record<string, RankingRow> = {};

    votosPartido.forEach((vote) => {
      const player = playerMap.get(vote.player_id);

      if (!contador[vote.player_id]) {
        contador[vote.player_id] = {
          player_id: vote.player_id,
          player_name: player?.name ?? "Jugador",
          player_number: player?.number ?? null,
          team_name:
            teamMap.get(player?.team_id ?? "") ??
            teamMap.get(vote.team_id ?? "") ??
            "Equipo",
          votes: 0,
          percentage: 0,
          isNominee: nomineeSet.has(vote.player_id),
        };
      }

      contador[vote.player_id].votes += 1;
    });

    return Object.values(contador)
      .map((row) => ({
        ...row,
        percentage:
          totalVotos === 0 ? 0 : Math.round((row.votes / totalVotos) * 100),
      }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return a.player_name.localeCompare(b.player_name);
      });
  }, [votosPartido, players, teams, totalVotos, selectedNominees]);

  async function cargarDatos(matchMantenerId?: string) {
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

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, team_id, name, number")
      .order("number", { ascending: true })
      .order("name", { ascending: true });

    if (playersError) {
      console.error("Error cargando jugadores:", playersError);
      setMensaje("No se han podido cargar los jugadores.");
      setLoading(false);
      return;
    }

    setPlayers((playersData ?? []) as Player[]);

    const { data: nomineesData, error: nomineesError } = await supabase
      .from("mvp_nominees")
      .select("id, match_id, final_match_id, player_id, team_id");

    if (nomineesError) {
      console.error("Error cargando candidatos MVP:", nomineesError);
      setMensaje(
        "No se han podido cargar los candidatos MVP. Revisa que exista la tabla mvp_nominees."
      );
      setLoading(false);
      return;
    }

    setNominees((nomineesData ?? []) as MvpNominee[]);

    const { data: votesData, error: votesError } = await supabase
      .from("mvp_votes")
      .select("id, match_id, final_match_id, player_id, user_id, team_id");

    if (votesError) {
      console.error("Error cargando votos:", votesError);
      setMensaje("No se han podido cargar los votos MVP.");
      setLoading(false);
      return;
    }

    setVotes((votesData ?? []) as Vote[]);

    const { data: groupMatchesData, error: matchesError } = await supabase
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
      setMensaje("No se han podido cargar los partidos.");
      setLoading(false);
      return;
    }

    const partidosGrupo: AdminMvpMatch[] = (
      ((groupMatchesData as unknown as RawGroupMatch[]) ?? []) as RawGroupMatch[]
    ).map((match, index) => {
      const local = normalizarEquipo(match.home_team);
      const visitante = normalizarEquipo(match.away_team);

      return {
        id: match.id,
        tipo: "grupo",
        phaseLabel: "Clasificación",
        title: match.group_name ?? "Clasificación",
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_name: local?.name ?? "Local",
        away_name: visitante?.name ?? "Visitante",
        home_team_id: local?.id ?? null,
        away_team_id: visitante?.id ?? null,
        home_score: match.home_score,
        away_score: match.away_score,
        status: match.status,
        mvp_open: match.mvp_open,
        sort_order: index + 1,
      };
    });

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
      setMensaje("No se han podido cargar las eliminatorias.");
      setLoading(false);
      return;
    }

    const eliminatorias = (finalData ?? []) as FinalMatch[];

    const partidosFinales: AdminMvpMatch[] = eliminatorias.map((match) => {
      const local = resolverEquipoDesdeReferencia(
        match.home_ref,
        match.home_source_type,
        match.home_source_match_title,
        equipos,
        eliminatorias
      );

      const visitante = resolverEquipoDesdeReferencia(
        match.away_ref,
        match.away_source_type,
        match.away_source_match_title,
        equipos,
        eliminatorias
      );

      return {
        id: match.id,
        tipo: "final",
        phaseLabel: normalizarFase(match.phase),
        title: match.title,
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_name: local?.name ?? match.home_ref ?? "Local",
        away_name: visitante?.name ?? match.away_ref ?? "Visitante",
        home_team_id: local?.id ?? null,
        away_team_id: visitante?.id ?? null,
        home_score: match.home_score,
        away_score: match.away_score,
        status: match.status,
        mvp_open: match.mvp_open,
        sort_order: match.sort_order,
      };
    });

    const todos = ordenarPartidos([...partidosGrupo, ...partidosFinales]);
    setMatches(todos);

    const partidoMantener = matchMantenerId
      ? todos.find((match) => match.id === matchMantenerId)
      : selectedMatchId
        ? todos.find((match) => match.id === selectedMatchId)
        : null;

    const partidoInicial = partidoMantener ?? todos[0] ?? null;

    if (partidoInicial) {
      setSelectedMatchId(partidoInicial.id);
      setSelectedDate(partidoInicial.match_date ?? "");
    } else {
      setSelectedMatchId("");
      setSelectedDate("");
      setSelectorCandidatosAbierto(false);
      setEquipoAcordeonAbierto(null);
    }

    setLoading(false);
  }

  function seleccionarPartido(match: AdminMvpMatch) {
    setSelectedMatchId(match.id);
    setSelectorCandidatosAbierto(false);
    setEquipoAcordeonAbierto(null);
    setMensaje("");
  }

  function abrirSeleccionCandidatos(match: AdminMvpMatch) {
    setSelectedMatchId(match.id);
    setSelectorCandidatosAbierto(true);
    setEquipoAcordeonAbierto(null);
    setMensaje("");
    scrollToElement("editor-candidatos");
  }

  function seleccionarFechaCalendario(date: string, dayMatches: AdminMvpMatch[]) {
    setSelectedDate(date);
    setMensaje("");
    setSelectorCandidatosAbierto(false);
    setEquipoAcordeonAbierto(null);

    const primerPartido = dayMatches[0];

    if (primerPartido) {
      setSelectedMatchId(primerPartido.id);
    }

    scrollToElement("jornada-mvp");
  }

  function cambiarCandidato(playerId: string, checked: boolean) {
    setMensaje("");

    setCandidateDraftIds((actuales) => {
      if (checked) {
        if (actuales.includes(playerId)) return actuales;
        return [...actuales, playerId];
      }

      return actuales.filter((id) => id !== playerId);
    });
  }

  function getVotosDePartido(match: AdminMvpMatch) {
    return votes.filter((vote) => {
      if (match.tipo === "final") {
        return vote.final_match_id === match.id;
      }

      return vote.match_id === match.id;
    });
  }

  function getCandidatosDePartido(match: AdminMvpMatch) {
    return nominees.filter((nominee) => {
      if (match.tipo === "final") {
        return nominee.final_match_id === match.id;
      }

      return nominee.match_id === match.id;
    });
  }

  async function guardarCandidatos(abrirDespues: boolean) {
    if (!selectedMatch) {
      setMensaje("Selecciona un partido.");
      return;
    }

    if (!equiposPartidoResueltos) {
      setMensaje(
        "Este partido todavía no tiene los dos equipos resueltos. No se pueden seleccionar candidatos."
      );
      return;
    }

    const esReinicioVotacion =
      candidateDraftIds.length === 0 &&
      (selectedNominees.length > 0 ||
        votosPartido.length > 0 ||
        Boolean(selectedMatch.mvp_open));

    if (candidateDraftIds.length === 0 && !esReinicioVotacion) {
      setMensaje("Selecciona al menos un candidato MVP.");
      return;
    }

    const playerMap = new Map(players.map((player) => [player.id, player]));

    const candidatosValidos = candidateDraftIds
      .map((id) => playerMap.get(id))
      .filter(Boolean) as Player[];

    const idsValidos = candidatosValidos.map((player) => player.id);

    const votosFueraDeCandidatos = votosPartido.filter(
      (vote) => !idsValidos.includes(vote.player_id)
    );

    if (votosFueraDeCandidatos.length > 0) {
      const confirmar = window.confirm(
        candidatosValidos.length === 0
          ? "Vas a reiniciar la votación MVP de este partido.\n\nSe borrarán todos los candidatos y todos los votos emitidos.\n\n¿Continuar?"
          : "Hay votos de jugadores que ya no estarán como candidatos.\n\nSi guardas esta selección, esos votos se borrarán para que el ranking quede limpio.\n\n¿Continuar?"
      );

      if (!confirmar) return;
    }

    setSaving(true);
    setMensaje("");

    const columna =
      selectedMatch.tipo === "final" ? "final_match_id" : "match_id";

    const { error: deleteNomineesError } = await supabase
      .from("mvp_nominees")
      .delete()
      .eq(columna, selectedMatch.id);

    if (deleteNomineesError) {
      console.error("Error borrando candidatos:", deleteNomineesError);
      setMensaje("No se han podido actualizar los candidatos MVP.");
      setSaving(false);
      return;
    }

    if (votosFueraDeCandidatos.length > 0) {
      const playerIdsBorrar = Array.from(
        new Set(votosFueraDeCandidatos.map((vote) => vote.player_id))
      );

      for (const playerId of playerIdsBorrar) {
        const { error } = await supabase
          .from("mvp_votes")
          .delete()
          .eq(columna, selectedMatch.id)
          .eq("player_id", playerId);

        if (error) {
          console.error("Error borrando votos fuera de candidatos:", error);
          setMensaje(
            "Candidatos actualizados, pero no se han podido limpiar todos los votos antiguos."
          );
          setSaving(false);
          return;
        }
      }
    }

    if (candidatosValidos.length === 0) {
      const tabla = selectedMatch.tipo === "final" ? "final_matches" : "matches";

      const { error: closeError } = await supabase
        .from(tabla)
        .update({ mvp_open: false })
        .eq("id", selectedMatch.id);

      if (closeError) {
        console.error("Error cerrando votación al reiniciar:", closeError);
        setMensaje(
          "Se han borrado candidatos y votos, pero no se ha podido cerrar la votación MVP."
        );
        setSaving(false);
        return;
      }

      setMensaje(
        "Votación MVP reiniciada correctamente. Se han borrado candidatos y votos."
      );

      await cargarDatos(selectedMatch.id);
      setSelectorCandidatosAbierto(true);
      setSaving(false);
      return;
    }

    const insertPayload = candidatosValidos.map((player) => ({
      match_id: selectedMatch.tipo === "grupo" ? selectedMatch.id : null,
      final_match_id: selectedMatch.tipo === "final" ? selectedMatch.id : null,
      player_id: player.id,
      team_id: player.team_id,
    }));

    const { error: insertError } = await supabase
      .from("mvp_nominees")
      .insert(insertPayload);

    if (insertError) {
      console.error("Error insertando candidatos:", insertError);
      setMensaje("No se han podido guardar los candidatos MVP.");
      setSaving(false);
      return;
    }

    if (abrirDespues) {
      const tabla = selectedMatch.tipo === "final" ? "final_matches" : "matches";

      const { error: openError } = await supabase
        .from(tabla)
        .update({ mvp_open: true })
        .eq("id", selectedMatch.id);

      if (openError) {
        console.error("Error abriendo votación:", openError);
        setMensaje(
          "Candidatos guardados, pero no se ha podido abrir la votación MVP."
        );
        setSaving(false);
        return;
      }
    }

    setMensaje(
      abrirDespues
        ? "Candidatos guardados y votación MVP abierta correctamente."
        : "Candidatos MVP guardados correctamente."
    );

    await cargarDatos(selectedMatch.id);
    setSelectorCandidatosAbierto(true);
    setSaving(false);
  }

  async function cerrarVotacion(match: AdminMvpMatch) {
    const confirmar = window.confirm(
      "¿Seguro que quieres cerrar la votación MVP de este partido?"
    );

    if (!confirmar) return;

    setSaving(true);
    setMensaje("");

    const tabla = match.tipo === "final" ? "final_matches" : "matches";

    const { error } = await supabase
      .from(tabla)
      .update({ mvp_open: false })
      .eq("id", match.id);

    if (error) {
      console.error("Error cerrando votación:", error);
      setMensaje("No se ha podido cerrar la votación.");
      setSaving(false);
      return;
    }

    setMensaje("Votación MVP cerrada correctamente.");
    await cargarDatos(match.id);
    setSaving(false);
  }

  async function borrarVotosPartido() {
    if (!selectedMatch) {
      setMensaje("Selecciona un partido.");
      return;
    }

    const confirmar = window.confirm(
      "Esto borrará todos los votos MVP de este partido.\n\n¿Seguro que quieres continuar?"
    );

    if (!confirmar) return;

    setSaving(true);
    setMensaje("");

    const columna =
      selectedMatch.tipo === "final" ? "final_match_id" : "match_id";

    const { error } = await supabase
      .from("mvp_votes")
      .delete()
      .eq(columna, selectedMatch.id);

    if (error) {
      console.error("Error borrando votos:", error);
      setMensaje("No se han podido borrar los votos de este partido.");
      setSaving(false);
      return;
    }

    setMensaje("Votos MVP borrados correctamente para este partido.");
    await cargarDatos(selectedMatch.id);
    setSaving(false);
  }

  function renderMarcador(match: AdminMvpMatch) {
    if (match.home_score === null || match.away_score === null) {
      return "Sin resultado";
    }

    return `${match.home_score} - ${match.away_score}`;
  }

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
                    if (hasMatches) {
                      seleccionarFechaCalendario(date, dayMatches);
                    }
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

  function renderJugadorCandidato(player: Player) {
    const checked = candidateDraftIds.includes(player.id);

    return (
      <label
        key={player.id}
        className={`flex items-center justify-between gap-3 rounded-2xl p-3 text-sm font-bold shadow-sm ${
          checked
            ? "bg-emerald-100 text-emerald-900"
            : "bg-slate-100 text-slate-800"
        }`}
      >
        <span className="min-w-0 break-words">
          {player.number !== null
            ? `${player.number} · ${player.name}`
            : player.name}
        </span>

        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => cambiarCandidato(player.id, event.target.checked)}
          className="h-6 w-6 shrink-0"
        />
      </label>
    );
  }

  function renderAcordeonEquipo(
    tipo: "home" | "away",
    nombre: string,
    jugadores: Player[]
  ) {
    const abierto = equipoAcordeonAbierto === tipo;

    return (
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <button
          onClick={() =>
            setEquipoAcordeonAbierto((actual) =>
              actual === tipo ? null : tipo
            )
          }
          className="flex w-full items-center justify-between gap-3 bg-red-600 px-4 py-4 text-left text-white"
        >
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-red-100">
              Equipo
            </p>

            <p className="break-words text-lg font-black leading-tight">
              {nombre}
            </p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl font-black">
            {abierto ? "−" : "+"}
          </div>
        </button>

        {abierto && (
          <div className="space-y-2 p-3">
            {jugadores.length === 0 ? (
              <p className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                No hay jugadores en este equipo.
              </p>
            ) : (
              jugadores.map((player) => renderJugadorCandidato(player))
            )}
          </div>
        )}
      </div>
    );
  }

  function renderPartidoCard(match: AdminMvpMatch) {
    const seleccionado = selectedMatch?.id === match.id;
    const votos = getVotosDePartido(match);
    const candidatos = getCandidatosDePartido(match);
    const abierto = Boolean(match.mvp_open);

    return (
      <div
        key={`${match.tipo}-${match.id}`}
        className={`rounded-2xl p-4 shadow-sm ${
          seleccionado ? "border-2 border-red-500 bg-red-50" : "bg-slate-100"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-red-600">
              {match.tipo === "final"
                ? `${match.phaseLabel} · ${match.title}`
                : "Clasificación"}
            </p>

            <p className="mt-2 break-words text-lg font-black leading-tight">
              {match.home_name} vs {match.away_name}
            </p>

            <p className="mt-2 text-xs font-bold text-slate-500">
              {match.match_time ?? "Hora pendiente"} ·{" "}
              {match.field ?? "Campo pendiente"} · {estadoBonito(match.status)}
            </p>
          </div>

          <div
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
              abierto
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {abierto ? "Abierta" : "Cerrada"}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-xs font-black uppercase text-slate-400">
              Resultado
            </p>
            <p className="mt-1 text-sm font-black text-slate-900">
              {renderMarcador(match)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-xs font-black uppercase text-slate-400">
              Candidatos
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {candidatos.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-3 text-center">
            <p className="text-xs font-black uppercase text-slate-400">Votos</p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {votos.length}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          <button
            onClick={() => abrirSeleccionCandidatos(match)}
            disabled={saving}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-black text-white shadow disabled:opacity-60"
          >
            {abierto ? "Modificar candidatos MVP" : "Seleccionar jugadores MVP"}
          </button>

          {abierto && (
            <button
              onClick={() => cerrarVotacion(match)}
              disabled={saving}
              className="w-full rounded-xl bg-slate-950 py-3 text-sm font-black text-white shadow disabled:opacity-60"
            >
              Cerrar votación MVP
            </button>
          )}

          {abierto && (
            <Link
              href={`/votar-mvp?match=${match.id}&type=${match.tipo}`}
              className="block rounded-xl bg-white py-3 text-center text-sm font-black text-slate-950 shadow ring-1 ring-slate-200"
            >
              Ver pantalla de votación
            </Link>
          )}

          {!seleccionado && (
            <button
              onClick={() => seleccionarPartido(match)}
              className="w-full rounded-xl bg-white py-3 text-sm font-black text-slate-900 shadow ring-1 ring-slate-200"
            >
              Ver ranking del partido
            </button>
          )}
        </div>
      </div>
    );
  }

  const mensajeCorrecto =
    mensaje.includes("correctamente") || mensaje.includes("borrados");

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
              Votaciones MVP
            </h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Día, partido, candidatos y votación
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
              Cargando votaciones MVP...
            </div>
          ) : matches.length === 0 ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Todavía no hay partidos configurados.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {renderMonth(currentMonth)}

              <div
                id="jornada-mvp"
                className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur"
              >
                <div className="bg-slate-950 px-5 py-4 text-center text-white">
                  <p className="text-sm font-black uppercase tracking-widest text-red-300">
                    Jornada MVP
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    {selectedDate
                      ? formatearJornada(selectedDate)
                      : "Partidos sin fecha"}
                  </h2>
                </div>

                <div className="p-4">
                  {selectedMatches.length === 0 ? (
                    <p className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                      Toca un día con partidos para gestionar la votación MVP.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedMatches.map((match) => renderPartidoCard(match))}
                    </div>
                  )}
                </div>
              </div>

              {selectedMatch && selectorCandidatosAbierto && (
                <div
                  id="editor-candidatos"
                  className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur"
                >
                  <p className="text-sm font-black uppercase tracking-widest text-red-600">
                    Candidatos MVP del partido
                  </p>

                  <h2 className="mt-2 break-words text-2xl font-black leading-tight">
                    {selectedMatch.home_name} vs {selectedMatch.away_name}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-slate-500">
                    {formatearFechaSegura(selectedMatch.match_date)} ·{" "}
                    {selectedMatch.match_time ?? "Hora pendiente"} ·{" "}
                    {selectedMatch.field ?? "Campo pendiente"}
                  </p>

                  {!equiposPartidoResueltos ? (
                    <p className="mt-4 rounded-2xl bg-yellow-100 p-4 text-sm font-bold text-yellow-900">
                      Este partido todavía no tiene los dos equipos resueltos.
                      Cuando estén definidos, podrás seleccionar candidatos.
                    </p>
                  ) : (
                    <>
                      <div className="mt-5 space-y-4">
                        {renderAcordeonEquipo(
                          "home",
                          selectedMatch.home_name,
                          jugadoresLocal
                        )}

                        {renderAcordeonEquipo(
                          "away",
                          selectedMatch.away_name,
                          jugadoresVisitante
                        )}
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-center">
                        <p className="text-xs font-black uppercase text-slate-500">
                          Candidatos seleccionados
                        </p>

                        <p className="mt-1 text-4xl font-black text-slate-950">
                          {totalCandidatos}
                        </p>
                      </div>

                      <button
                        onClick={() => guardarCandidatos(!selectedMatch.mvp_open)}
                        disabled={
                          saving ||
                          (totalCandidatos === 0 && !puedeReiniciarVotacion) ||
                          (Boolean(selectedMatch.mvp_open) &&
                            !hayCambiosCandidatos &&
                            !puedeReiniciarVotacion)
                        }
                        className="mt-5 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:bg-slate-300"
                      >
                        {saving
                          ? "Guardando..."
                          : puedeReiniciarVotacion
                            ? "Reiniciar votación MVP"
                            : selectedMatch.mvp_open
                              ? hayCambiosCandidatos
                                ? "Guardar cambios en candidatos"
                                : "Candidatos guardados"
                              : "Guardar candidatos y abrir votación MVP"}
                      </button>

                      {selectedMatch.mvp_open && hayCambiosCandidatos && (
                        <p className="mt-3 rounded-xl bg-yellow-100 p-3 text-xs font-bold text-yellow-900">
                          La votación está abierta. Guarda los cambios para que
                          la pantalla pública muestre la lista actualizada.
                        </p>
                      )}

                      {puedeReiniciarVotacion && (
                        <p className="mt-3 rounded-xl bg-red-100 p-3 text-xs font-bold text-red-800">
                          Si reinicias la votación MVP, se borrarán los
                          candidatos, los votos emitidos y la votación quedará
                          cerrada.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {selectedMatch && (
                <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-red-600">
                        Ranking MVP
                      </p>

                      <h2 className="mt-1 break-words text-xl font-black leading-tight">
                        {selectedMatch.home_name} vs {selectedMatch.away_name}
                      </h2>
                    </div>

                    <div
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                        selectedMatch.mvp_open
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {selectedMatch.mvp_open ? "Abierta" : "Cerrada"}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-950 p-4 text-center text-white">
                      <p className="text-3xl font-black">
                        {selectedNominees.length}
                      </p>

                      <p className="text-xs font-black uppercase text-slate-300">
                        Candidatos
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4 text-center text-white">
                      <p className="text-3xl font-black">{totalVotos}</p>

                      <p className="text-xs font-black uppercase text-slate-300">
                        Votos
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4 text-center text-white">
                      <p className="text-3xl font-black">{votantesUnicos}</p>

                      <p className="text-xs font-black uppercase text-slate-300">
                        Votantes
                      </p>
                    </div>
                  </div>

                  {ranking.length === 0 ? (
                    <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                      Todavía no hay votos para este partido.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {ranking.map((row, index) => (
                        <div
                          key={row.player_id}
                          className={`rounded-2xl p-4 shadow-sm ${
                            row.isNominee ? "bg-slate-100" : "bg-yellow-100"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
                                {index + 1}
                              </div>

                              <div className="min-w-0">
                                <p className="break-words font-black leading-tight">
                                  {row.player_number !== null
                                    ? `${row.player_number} · ${row.player_name}`
                                    : row.player_name}
                                </p>

                                <p className="text-xs font-bold text-slate-500">
                                  {row.team_name}
                                </p>

                                {!row.isNominee && (
                                  <p className="mt-1 text-xs font-black text-yellow-800">
                                    Ya no está en candidatos
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-2xl font-black text-red-600">
                                {row.votes}
                              </p>

                              <p className="text-xs font-bold text-slate-500">
                                {row.percentage}%
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-600"
                              style={{ width: `${row.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {totalVotos > 0 && (
                    <button
                      onClick={borrarVotosPartido}
                      disabled={saving}
                      className="mt-4 w-full rounded-xl bg-red-100 py-3 font-black text-red-700 shadow disabled:opacity-60"
                    >
                      Borrar votos de este partido
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}