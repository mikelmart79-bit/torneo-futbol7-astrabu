"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type MatchType = "grupo" | "final";
type PlayerType = "M" | "F";

type TeamRef = {
  id: string;
  name: string;
};

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

type RawGroupMatch = {
  id: string;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  incidents: string | null;
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
  incidents: string | null;
};

type ActaMatch = {
  id: string;
  tipo: MatchType;
  phase: string;
  title: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_name: string;
  away_name: string;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: string | null;
  incidents: string | null;
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
  reason: string;
  games: number;
  served: number;
  status: string;
};

type CountRow = {
  player_id: string;
  team_id: string;
  total: number;
};

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function formatearFechaCorta(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";

  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

function columnaPartido(tipo: MatchType) {
  return tipo === "grupo" ? "match_id" : "final_match_id";
}

function estadoCerrado(status: string | null | undefined) {
  return normalizarTexto(status) === "cerrado";
}

function estadoFinalizado(status: string | null | undefined) {
  const limpio = normalizarTexto(status);
  return limpio === "finalizado" || limpio === "cerrado";
}

function nombreJugador(player: Player | undefined) {
  if (!player) return "Jugador";

  return player.number !== null
    ? `${player.number} · ${player.name}`
    : player.name;
}

function tipoJugador(player: Player | undefined): PlayerType {
  return player?.player_type === "F" ? "F" : "M";
}

function sumarPorJugador(rows: Array<{ player_id: string; team_id: string }>) {
  const contador: Record<string, CountRow> = {};

  rows.forEach((row) => {
    const key = `${row.player_id}-${row.team_id}`;

    if (!contador[key]) {
      contador[key] = {
        player_id: row.player_id,
        team_id: row.team_id,
        total: 0,
      };
    }

    contador[key].total += 1;
  });

  return Object.values(contador);
}

function LoadingActa() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm print:hidden"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6">
        <div className="rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
          Cargando acta...
        </div>
      </section>
    </main>
  );
}

function ActaPartidoContent() {
  const searchParams = useSearchParams();

  const matchId = searchParams.get("match") ?? "";
  const typeParam = searchParams.get("type") ?? "";
  const tipo: MatchType | null =
    typeParam === "final" || typeParam === "grupo" ? typeParam : null;

  const [acta, setActa] = useState<ActaMatch | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [participants, setParticipants] = useState<MatchPlayerRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarActa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, typeParam]);

  async function cargarActa() {
    setLoading(true);
    setMensaje("");
    setActa(null);

    if (!matchId || !tipo) {
      setMensaje("No se ha indicado correctamente el partido del acta.");
      setLoading(false);
      return;
    }

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

    let actaBase: ActaMatch | null = null;

    if (tipo === "grupo") {
      const { data, error } = await supabase
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
          incidents,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `
        )
        .eq("id", matchId)
        .single();

      if (error || !data) {
        console.error("Error cargando partido:", error);
        setMensaje("No se ha podido cargar el partido.");
        setLoading(false);
        return;
      }

      const match = data as unknown as RawGroupMatch;
      const local = normalizarEquipo(match.home_team);
      const visitante = normalizarEquipo(match.away_team);

      actaBase = {
        id: match.id,
        tipo: "grupo",
        phase: "Clasificación",
        title: match.group_name ?? "Clasificación",
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_team_id: local?.id ?? null,
        away_team_id: visitante?.id ?? null,
        home_name: local?.name ?? "Local",
        away_name: visitante?.name ?? "Visitante",
        home_score: match.home_score,
        away_score: match.away_score,
        home_penalties: null,
        away_penalties: null,
        status: match.status,
        incidents: match.incidents,
      };
    } else {
      const { data, error } = await supabase
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
          incidents
        `
        )
        .eq("id", matchId)
        .single();

      if (error || !data) {
        console.error("Error cargando eliminatoria:", error);
        setMensaje("No se ha podido cargar la eliminatoria.");
        setLoading(false);
        return;
      }

      const match = data as FinalMatch;

      const local = equipos.find(
        (team) => normalizarTexto(team.name) === normalizarTexto(match.home_ref)
      );

      const visitante = equipos.find(
        (team) => normalizarTexto(team.name) === normalizarTexto(match.away_ref)
      );

      actaBase = {
        id: match.id,
        tipo: "final",
        phase: match.phase,
        title: match.title,
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_team_id: local?.id ?? null,
        away_team_id: visitante?.id ?? null,
        home_name: match.home_ref || "Local",
        away_name: match.away_ref || "Visitante",
        home_score: match.home_score,
        away_score: match.away_score,
        home_penalties: match.home_penalties,
        away_penalties: match.away_penalties,
        status: match.status,
        incidents: match.incidents,
      };
    }

    setActa(actaBase);

    const columna = columnaPartido(tipo);

    const [
      playersResult,
      participantsResult,
      goalsResult,
      cardsResult,
      suspensionsResult,
    ] = await Promise.all([
      supabase
        .from("players")
        .select("id, team_id, name, number, player_type")
        .order("number", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("match_players")
        .select("id, player_id, team_id")
        .eq(columna, matchId),
      supabase
        .from("match_goals")
        .select("id, player_id, team_id")
        .eq(columna, matchId),
      supabase
        .from("match_cards")
        .select("id, player_id, team_id, card_type")
        .eq(columna, matchId),
      supabase
        .from("suspensions")
        .select("id, player_id, team_id, reason, games, served, status")
        .eq(columna, matchId),
    ]);

    if (playersResult.error) {
      console.error("Error cargando jugadores:", playersResult.error);
      setMensaje("No se han podido cargar los jugadores.");
      setLoading(false);
      return;
    }

    if (participantsResult.error) {
      console.error("Error cargando participantes:", participantsResult.error);
      setMensaje("No se han podido cargar los participantes.");
      setLoading(false);
      return;
    }

    if (goalsResult.error) {
      console.error("Error cargando goles:", goalsResult.error);
      setMensaje("No se han podido cargar los goles.");
      setLoading(false);
      return;
    }

    if (cardsResult.error) {
      console.error("Error cargando tarjetas:", cardsResult.error);
      setMensaje("No se han podido cargar las tarjetas.");
      setLoading(false);
      return;
    }

    if (suspensionsResult.error) {
      console.error("Error cargando sanciones:", suspensionsResult.error);
      setMensaje("No se han podido cargar las sanciones.");
      setLoading(false);
      return;
    }

    setPlayers((playersResult.data ?? []) as Player[]);
    setParticipants((participantsResult.data ?? []) as MatchPlayerRow[]);
    setGoals((goalsResult.data ?? []) as GoalRow[]);
    setCards((cardsResult.data ?? []) as CardRow[]);
    setSuspensions((suspensionsResult.data ?? []) as Suspension[]);

    setLoading(false);
  }

  function teamName(teamId: string) {
    return teams.find((team) => team.id === teamId)?.name ?? "Equipo";
  }

  function playerById(playerId: string) {
    return players.find((player) => player.id === playerId);
  }

  function ordenEquipo(teamId: string) {
    if (teamId === acta?.home_team_id) return 0;
    if (teamId === acta?.away_team_id) return 1;
    return 2;
  }

  function ordenarPorEquipoYJugador<
    T extends { player_id: string; team_id: string }
  >(lista: T[]) {
    return [...lista].sort((a, b) => {
      const ordenA = ordenEquipo(a.team_id);
      const ordenB = ordenEquipo(b.team_id);

      if (ordenA !== ordenB) return ordenA - ordenB;

      const playerA = playerById(a.player_id);
      const playerB = playerById(b.player_id);

      const dorsalA = playerA?.number ?? 9999;
      const dorsalB = playerB?.number ?? 9999;

      if (dorsalA !== dorsalB) return dorsalA - dorsalB;

      return (playerA?.name ?? "").localeCompare(playerB?.name ?? "");
    });
  }

  const participantesAgrupados = useMemo(() => {
    const ordenados = ordenarPorEquipoYJugador(participants);

    return {
      local: ordenados.filter((row) => row.team_id === acta?.home_team_id),
      visitante: ordenados.filter((row) => row.team_id === acta?.away_team_id),
      otros: ordenados.filter(
        (row) =>
          row.team_id !== acta?.home_team_id &&
          row.team_id !== acta?.away_team_id
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, players, acta]);

  const golesAgrupados = useMemo(() => {
    return ordenarPorEquipoYJugador(sumarPorJugador(goals));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, players, acta]);

  const amarillasAgrupadas = useMemo(() => {
    return ordenarPorEquipoYJugador(
      sumarPorJugador(cards.filter((card) => card.card_type === "yellow"))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, players, acta]);

  const rojasAgrupadas = useMemo(() => {
    return ordenarPorEquipoYJugador(
      sumarPorJugador(cards.filter((card) => card.card_type === "red"))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, players, acta]);

  const sancionesOrdenadas = useMemo(() => {
    return [...suspensions].sort((a, b) => {
      const ordenA = ordenEquipo(a.team_id);
      const ordenB = ordenEquipo(b.team_id);

      if (ordenA !== ordenB) return ordenA - ordenB;

      const playerA = playerById(a.player_id);
      const playerB = playerById(b.player_id);

      return (playerA?.name ?? "").localeCompare(playerB?.name ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspensions, players, acta]);

  function printPage() {
    window.print();
  }

  function renderMarcaJugador(player: Player | undefined) {
    const tipo = tipoJugador(player);

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          tipo === "F"
            ? "bg-emerald-100 text-emerald-800"
            : "bg-blue-100 text-blue-800"
        }`}
      >
        {tipo}
      </span>
    );
  }

  function renderParticipantesEquipo(
    titulo: string,
    equipo: string,
    rows: MatchPlayerRow[]
  ) {
    return (
      <div className="overflow-hidden rounded-2xl bg-white print:border print:border-slate-200">
        <div className="bg-red-600 px-4 py-4 text-white print:bg-slate-900">
          <p className="text-xs font-black uppercase tracking-widest text-red-100 print:text-slate-300">
            {titulo}
          </p>

          <h3 className="mt-1 break-words text-lg font-black leading-tight text-white">
            {equipo}
          </h3>
        </div>

        <div className="p-4">
          {rows.length === 0 ? (
            <p className="text-sm font-bold text-slate-400">
              Sin jugadores registrados.
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => {
                const player = playerById(row.player_id);

                return (
                  <div
                    key={`${row.player_id}-${row.team_id}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 print:border print:border-slate-100 print:bg-white"
                  >
                    <p className="font-black">{nombreJugador(player)}</p>

                    {renderMarcaJugador(player)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingActa />;
  }

  if (mensaje || !acta) {
    return (
      <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm print:hidden"
        />

        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-red-100 p-5 text-sm font-bold text-red-700 shadow-2xl">
            {mensaje || "No se ha podido cargar el acta."}
          </div>

          <Link
            href="/admin/fichas-partido"
            className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
          >
            Volver a fichas
          </Link>
        </section>
      </main>
    );
  }

  const cerrada = estadoCerrado(acta.status);
  const finalizada = estadoFinalizado(acta.status);
  const hayParticipantes =
    participantesAgrupados.local.length > 0 ||
    participantesAgrupados.visitante.length > 0 ||
    participantesAgrupados.otros.length > 0;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900 print:bg-white">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm print:hidden"
      />

      <section className="relative z-10 mx-auto max-w-3xl px-4 py-6 pb-8 print:max-w-none print:px-0 print:py-0">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">
          <Link
            href="/admin/fichas-partido"
            className="rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
          >
            Volver a fichas
          </Link>

          <button
            onClick={printPage}
            className="rounded-2xl bg-red-600 p-4 text-center font-black text-white shadow"
          >
            Imprimir / Guardar PDF
          </button>
        </div>

        <article className="overflow-hidden rounded-3xl bg-white shadow-2xl print:rounded-none print:shadow-none">
          <div className="bg-slate-950 px-5 py-6 text-white print:bg-white print:text-slate-950">
            <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-red-300 print:text-slate-500">
              Torneo Fútbol 7 Astrabudua
            </p>

            <h1 className="mt-2 text-center text-3xl font-black">
              Acta del partido
            </h1>

            <div className="mt-4 flex justify-center">
              <span
                className={`rounded-full px-4 py-2 text-xs font-black uppercase ${
                  cerrada
                    ? "bg-emerald-500 text-white"
                    : finalizada
                    ? "bg-yellow-300 text-slate-950"
                    : "bg-white/20 text-white print:bg-slate-100 print:text-slate-700"
                }`}
              >
                {cerrada
                  ? "Acta cerrada"
                  : finalizada
                  ? "Acta provisional"
                  : "Acta pendiente"}
              </span>
            </div>
          </div>

          <div className="p-5 print:p-6">
            <section className="rounded-3xl bg-slate-100 p-5 print:border print:border-slate-300 print:bg-white">
              <p className="text-center text-sm font-black uppercase tracking-widest text-red-600">
                {acta.tipo === "final"
                  ? `${acta.phase} · ${acta.title}`
                  : "Clasificación"}
              </p>

              <div className="mt-5 rounded-[2rem] bg-white p-4 shadow-sm print:border print:border-slate-200 print:shadow-none">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-100 p-4 text-center print:border print:border-slate-200 print:bg-white">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Local
                    </p>

                    <p className="mt-2 break-words text-2xl font-black leading-tight text-slate-950 sm:text-xl">
                      {acta.home_name}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4 text-center print:border print:border-slate-200 print:bg-white">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Visitante
                    </p>

                    <p className="mt-2 break-words text-2xl font-black leading-tight text-slate-950 sm:text-xl">
                      {acta.away_name}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl bg-slate-950 px-5 py-5 text-center text-white print:border print:border-slate-900 print:bg-white print:text-slate-950">
                  <div className="flex items-center justify-center gap-5">
                    <span className="min-w-12 text-6xl font-black leading-none">
                      {acta.home_score ?? "-"}
                    </span>

                    <span className="text-5xl font-black leading-none text-red-400 print:text-slate-500">
                      -
                    </span>

                    <span className="min-w-12 text-6xl font-black leading-none">
                      {acta.away_score ?? "-"}
                    </span>
                  </div>

                  {acta.tipo === "final" &&
                    acta.home_penalties !== null &&
                    acta.away_penalties !== null && (
                      <p className="mt-3 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase print:bg-slate-100">
                        Penaltis {acta.home_penalties} - {acta.away_penalties}
                      </p>
                    )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-3 print:border print:border-slate-200">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Fecha
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {formatearFechaCorta(acta.match_date)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-3 print:border print:border-slate-200">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Hora
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {acta.match_time ?? "--:--"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-3 print:border print:border-slate-200">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Campo
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {acta.field ?? "Pendiente"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-3xl bg-slate-50 p-5 print:border print:border-slate-300 print:bg-white">
              <h2 className="text-xl font-black">Jugadores participantes</h2>

              {!hayParticipantes ? (
                <p className="mt-3 text-sm font-bold text-slate-500">
                  No hay jugadores participantes registrados.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {renderParticipantesEquipo(
                    "Local",
                    acta.home_name,
                    participantesAgrupados.local
                  )}

                  {renderParticipantesEquipo(
                    "Visitante",
                    acta.away_name,
                    participantesAgrupados.visitante
                  )}

                  {participantesAgrupados.otros.length > 0 && (
                    <div className="rounded-2xl bg-white p-4 print:border print:border-slate-200">
                      <p className="text-xs font-black uppercase tracking-widest text-red-600">
                        Otros
                      </p>

                      <div className="mt-3 space-y-2">
                        {participantesAgrupados.otros.map((row) => (
                          <div
                            key={`${row.player_id}-${row.team_id}`}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 print:border print:border-slate-100 print:bg-white"
                          >
                            <p className="font-black">
                              {nombreJugador(playerById(row.player_id))}
                            </p>

                            {renderMarcaJugador(playerById(row.player_id))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="mt-5 rounded-3xl bg-slate-50 p-5 print:border print:border-slate-300 print:bg-white">
              <h2 className="text-xl font-black">Goles</h2>

              {golesAgrupados.length === 0 ? (
                <p className="mt-3 text-sm font-bold text-slate-500">
                  No hay goles registrados.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {golesAgrupados.map((row) => (
                    <div
                      key={`${row.player_id}-${row.team_id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 print:border print:border-slate-200"
                    >
                      <div>
                        <p className="font-black">
                          {nombreJugador(playerById(row.player_id))}
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          {teamName(row.team_id)}
                        </p>
                      </div>

                      <p className="text-2xl font-black text-red-600">
                        {row.total}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-5 rounded-3xl bg-slate-50 p-5 print:border print:border-slate-300 print:bg-white">
              <h2 className="text-xl font-black">Tarjetas</h2>

              {amarillasAgrupadas.length === 0 &&
              rojasAgrupadas.length === 0 ? (
                <p className="mt-3 text-sm font-bold text-slate-500">
                  No hay tarjetas registradas.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-black uppercase text-slate-500">
                      Amarillas
                    </p>

                    {amarillasAgrupadas.length === 0 ? (
                      <p className="mt-2 text-sm font-bold text-slate-400">
                        Sin amarillas.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {amarillasAgrupadas.map((row) => (
                          <div
                            key={`yellow-${row.player_id}-${row.team_id}`}
                            className="flex items-center justify-between rounded-2xl bg-white p-3 print:border print:border-slate-200"
                          >
                            <div>
                              <p className="font-black">
                                {nombreJugador(playerById(row.player_id))}
                              </p>
                              <p className="text-xs font-bold text-slate-500">
                                {teamName(row.team_id)}
                              </p>
                            </div>

                            <p className="rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-slate-950">
                              {row.total}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-black uppercase text-slate-500">
                      Rojas
                    </p>

                    {rojasAgrupadas.length === 0 ? (
                      <p className="mt-2 text-sm font-bold text-slate-400">
                        Sin rojas.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {rojasAgrupadas.map((row) => (
                          <div
                            key={`red-${row.player_id}-${row.team_id}`}
                            className="flex items-center justify-between rounded-2xl bg-white p-3 print:border print:border-slate-200"
                          >
                            <div>
                              <p className="font-black">
                                {nombreJugador(playerById(row.player_id))}
                              </p>
                              <p className="text-xs font-bold text-slate-500">
                                {teamName(row.team_id)}
                              </p>
                            </div>

                            <p className="rounded-full bg-red-600 px-3 py-1 text-sm font-black text-white">
                              {row.total}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="mt-5 rounded-3xl bg-slate-50 p-5 print:border print:border-slate-300 print:bg-white">
              <h2 className="text-xl font-black">Incidencias</h2>

              {acta.incidents && acta.incidents.trim() !== "" ? (
                <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-relaxed text-slate-700">
                  {acta.incidents}
                </p>
              ) : (
                <p className="mt-3 text-sm font-bold text-slate-500">
                  No hay incidencias registradas.
                </p>
              )}
            </section>

            <section className="mt-5 rounded-3xl bg-slate-50 p-5 print:border print:border-slate-300 print:bg-white">
              <h2 className="text-xl font-black">Sanciones generadas</h2>

              {sancionesOrdenadas.length === 0 ? (
                <p className="mt-3 text-sm font-bold text-slate-500">
                  No hay sanciones generadas en este partido.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {sancionesOrdenadas.map((suspension) => (
                    <div
                      key={suspension.id}
                      className="rounded-2xl bg-white p-3 print:border print:border-slate-200"
                    >
                      <p className="font-black">
                        {nombreJugador(playerById(suspension.player_id))}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {teamName(suspension.team_id)}
                      </p>

                      <p className="mt-2 text-sm font-black text-red-700">
                        {suspension.reason}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {suspension.games} partido
                        {suspension.games === 1 ? "" : "s"} de sanción · Estado:{" "}
                        {suspension.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-6 border-t border-slate-200 pt-4 text-center">
              <p className="text-xs font-bold text-slate-500">
                {cerrada
                  ? "Acta cerrada y definitiva."
                  : finalizada
                  ? "Acta provisional pendiente de cierre definitivo."
                  : "Acta pendiente de finalización."}
              </p>
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}

export default function AdminActaPartidoPage() {
  return (
    <AdminGuard>
      <Suspense fallback={<LoadingActa />}>
        <ActaPartidoContent />
      </Suspense>
    </AdminGuard>
  );
}