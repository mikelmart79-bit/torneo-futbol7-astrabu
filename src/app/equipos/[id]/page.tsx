"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PlayerType = "M" | "F" | "-";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
  home_color: string | null;
  away_color: string | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  player_type: PlayerType | null;
};

type TeamRef = {
  id?: string;
  name: string;
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
};

type TeamCalendarMatch = {
  id: string;
  tipo: "grupo" | "final";
  phase: string;
  title: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_name: string;
  away_name: string;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: string | null;
  sort_order: number;
};

type MatchPlayerRow = {
  id: string;
  player_id: string;
};

type GoalRow = {
  id: string;
  player_id: string;
};

type CardRow = {
  id: string;
  player_id: string;
  card_type: "yellow" | "red";
};

type SuspensionRow = {
  id: string;
  player_id: string;
  status: string | null;
};

type PlayerStats = {
  played: number;
  goals: number;
  yellow: number;
  red: number;
  suspensions: number;
};

function ShirtIcon({ color }: { color: string }) {
  return (
    <div className="relative h-10 w-11">
      <div
        className="absolute left-2 top-1 h-9 w-7 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute left-0 top-2 h-4 w-4 -rotate-12 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute right-0 top-2 h-4 w-4 rotate-12 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function crearStatsVacias(): PlayerStats {
  return {
    played: 0,
    goals: 0,
    yellow: 0,
    red: 0,
    suspensions: 0,
  };
}

function normalizarTipoJugador(tipo: PlayerType | null | undefined): PlayerType {
  if (tipo === "M" || tipo === "F" || tipo === "-") return tipo;
  return "-";
}

function claseTipoJugador(tipo: PlayerType) {
  if (tipo === "F") return "bg-emerald-100 text-emerald-700";
  if (tipo === "M") return "bg-slate-200 text-slate-700";
  return "bg-white text-slate-500";
}

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function fechaPartidoValor(fecha: string | null, hora: string | null) {
  if (!fecha) return Number.POSITIVE_INFINITY;

  const [year, month, day] = fecha.split("-").map(Number);
  const [hour, minute] = (hora ?? "23:59").split(":").map(Number);

  return new Date(year, month - 1, day, hour || 0, minute || 0).getTime();
}

function formatearFechaCorta(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";

  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

function estadoFinalizado(status: string | null | undefined) {
  const limpio = normalizarTexto(status);
  return limpio === "finalizado" || limpio === "cerrado";
}

function partidoConResultado(partido: TeamCalendarMatch) {
  return (
    estadoFinalizado(partido.status) ||
    (partido.home_score !== null && partido.away_score !== null)
  );
}

function ordenarPartidos(partidos: TeamCalendarMatch[]) {
  return [...partidos].sort((a, b) => {
    const fechaA = fechaPartidoValor(a.match_date, a.match_time);
    const fechaB = fechaPartidoValor(b.match_date, b.match_time);

    if (fechaA !== fechaB) return fechaA - fechaB;

    return a.sort_order - b.sort_order;
  });
}

function marcadorTexto(partido: TeamCalendarMatch) {
  if (partido.home_score === null || partido.away_score === null) {
    return "vs";
  }

  const marcador = `${partido.home_score} - ${partido.away_score}`;

  if (
    partido.tipo === "final" &&
    partido.home_penalties !== null &&
    partido.away_penalties !== null
  ) {
    return `${marcador} · Pen. ${partido.home_penalties}-${partido.away_penalties}`;
  }

  return marcador;
}

function tipoActa(partido: TeamCalendarMatch) {
  return partido.tipo === "final" ? "final" : "grupo";
}

export default function EquipoDetalle() {
  const params = useParams();
  const idParam = params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [equipo, setEquipo] = useState<Team | null>(null);
  const [jugadores, setJugadores] = useState<Player[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [jugadoresFavoritos, setJugadoresFavoritos] = useState<string[]>([]);
  const [jugadoresAbiertos, setJugadoresAbiertos] = useState<string[]>([]);
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [partidosEquipo, setPartidosEquipo] = useState<TeamCalendarMatch[]>([]);
  const [estadisticas, setEstadisticas] = useState<Record<string, PlayerStats>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    const equiposGuardados = localStorage.getItem("equiposFavoritos");

    if (equiposGuardados) {
      try {
        setFavoritos(JSON.parse(equiposGuardados));
      } catch {
        localStorage.removeItem("equiposFavoritos");
        setFavoritos([]);
      }
    }

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

    async function cargarEquipo() {
      if (!id) {
        setEquipo(null);
        setErrorCarga("Equipo no encontrado.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorCarga("");
      setCalendarioAbierto(false);

      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id, name, group_name, home_color, away_color")
        .eq("id", id)
        .single();

      if (teamError || !teamData) {
        setEquipo(null);
        setErrorCarga("No se ha podido cargar el equipo.");
        setLoading(false);
        return;
      }

      const equipoActual = teamData as Team;
      setEquipo(equipoActual);

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, team_id, name, number, player_type")
        .eq("team_id", id)
        .order("number", { ascending: true })
        .order("name", { ascending: true });

      if (playersError) {
        setErrorCarga("No se ha podido cargar la plantilla.");
        setLoading(false);
        return;
      }

      const plantilla = (playersData ?? []) as Player[];
      setJugadores(plantilla);

      await Promise.all([
        cargarEstadisticasJugadores(plantilla),
        cargarCalendarioEquipo(equipoActual),
      ]);

      setLoading(false);
    }

    cargarEquipo();
  }, [id]);

  async function cargarCalendarioEquipo(equipoActual: Team) {
    const { data: groupData, error: groupError } = await supabase
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
      `,
      )
      .or(
        `home_team_id.eq.${equipoActual.id},away_team_id.eq.${equipoActual.id}`,
      )
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (groupError) {
      console.error("Error cargando calendario del equipo:", groupError);
    }

    const partidosGrupo: TeamCalendarMatch[] = (
      ((groupData as unknown as RawGroupMatch[]) ?? []) as RawGroupMatch[]
    ).map((match, index) => {
      const local = normalizarEquipo(match.home_team);
      const visitante = normalizarEquipo(match.away_team);

      return {
        id: match.id,
        tipo: "grupo",
        phase: "Clasificación",
        title: match.group_name ?? "Clasificación",
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_name: local?.name ?? "Local",
        away_name: visitante?.name ?? "Visitante",
        home_score: match.home_score,
        away_score: match.away_score,
        home_penalties: null,
        away_penalties: null,
        status: match.status,
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
        sort_order
      `,
      )
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true })
      .order("sort_order", { ascending: true });

    if (finalError) {
      console.error("Error cargando eliminatorias del equipo:", finalError);
    }

    const nombreEquipo = normalizarTexto(equipoActual.name);

    const partidosFinales: TeamCalendarMatch[] = (
      ((finalData ?? []) as FinalMatch[]) ?? []
    )
      .filter(
        (match) =>
          normalizarTexto(match.home_ref) === nombreEquipo ||
          normalizarTexto(match.away_ref) === nombreEquipo,
      )
      .map((match) => ({
        id: match.id,
        tipo: "final",
        phase: match.phase,
        title: match.title,
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_name: match.home_ref || "Local",
        away_name: match.away_ref || "Visitante",
        home_score: match.home_score,
        away_score: match.away_score,
        home_penalties: match.home_penalties,
        away_penalties: match.away_penalties,
        status: match.status,
        sort_order: match.sort_order,
      }));

    setPartidosEquipo(ordenarPartidos([...partidosGrupo, ...partidosFinales]));
  }

  async function cargarEstadisticasJugadores(plantilla: Player[]) {
    const playerIds = plantilla.map((player) => player.id);

    if (playerIds.length === 0) {
      setEstadisticas({});
      return;
    }

    const statsBase: Record<string, PlayerStats> = {};

    playerIds.forEach((playerId) => {
      statsBase[playerId] = crearStatsVacias();
    });

    const [playedResult, goalsResult, cardsResult, suspensionsResult] =
      await Promise.all([
        supabase
          .from("match_players")
          .select("id, player_id")
          .in("player_id", playerIds),
        supabase
          .from("match_goals")
          .select("id, player_id")
          .in("player_id", playerIds),
        supabase
          .from("match_cards")
          .select("id, player_id, card_type")
          .in("player_id", playerIds),
        supabase
          .from("suspensions")
          .select("id, player_id, status")
          .in("player_id", playerIds),
      ]);

    if (playedResult.error) {
      console.error("Error cargando partidos jugados:", playedResult.error);
    }

    if (goalsResult.error) {
      console.error("Error cargando goles:", goalsResult.error);
    }

    if (cardsResult.error) {
      console.error("Error cargando tarjetas:", cardsResult.error);
    }

    if (suspensionsResult.error) {
      console.error("Error cargando sanciones:", suspensionsResult.error);
    }

    ((playedResult.data ?? []) as MatchPlayerRow[]).forEach((row) => {
      if (!statsBase[row.player_id]) return;
      statsBase[row.player_id].played += 1;
    });

    ((goalsResult.data ?? []) as GoalRow[]).forEach((row) => {
      if (!statsBase[row.player_id]) return;
      statsBase[row.player_id].goals += 1;
    });

    ((cardsResult.data ?? []) as CardRow[]).forEach((row) => {
      if (!statsBase[row.player_id]) return;

      if (row.card_type === "yellow") {
        statsBase[row.player_id].yellow += 1;
      }

      if (row.card_type === "red") {
        statsBase[row.player_id].red += 1;
      }
    });

    ((suspensionsResult.data ?? []) as SuspensionRow[]).forEach((row) => {
      if (!statsBase[row.player_id]) return;
      statsBase[row.player_id].suspensions += 1;
    });

    setEstadisticas(statsBase);
  }

  const resultadosEquipo = useMemo(() => {
    return ordenarPartidos(partidosEquipo)
      .filter((partido) => partidoConResultado(partido))
      .reverse()
      .slice(0, 5);
  }, [partidosEquipo]);

  const proximosPartidosEquipo = useMemo(() => {
    return ordenarPartidos(partidosEquipo)
      .filter((partido) => !partidoConResultado(partido))
      .slice(0, 5);
  }, [partidosEquipo]);

  function toggleFavorito() {
    if (!equipo) return;

    const nuevosFavoritos = favoritos.includes(equipo.id)
      ? favoritos.filter((item) => item !== equipo.id)
      : [...favoritos, equipo.id];

    setFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));
  }

  function toggleJugadorFavorito(playerId: string) {
    const nuevosFavoritos = jugadoresFavoritos.includes(playerId)
      ? jugadoresFavoritos.filter((item) => item !== playerId)
      : [...jugadoresFavoritos, playerId];

    setJugadoresFavoritos(nuevosFavoritos);
    localStorage.setItem(
      "jugadoresFavoritos",
      JSON.stringify(nuevosFavoritos),
    );
  }

  function toggleJugadorAbierto(playerId: string) {
    setJugadoresAbiertos((actuales) =>
      actuales.includes(playerId)
        ? actuales.filter((item) => item !== playerId)
        : [...actuales, playerId],
    );
  }

  function statsJugador(playerId: string) {
    return estadisticas[playerId] ?? crearStatsVacias();
  }

  function renderPartidoEquipo(partido: TeamCalendarMatch) {
    const puedeVerActa = estadoFinalizado(partido.status);

    return (
      <div
        key={`${partido.tipo}-${partido.id}`}
        className="rounded-2xl bg-white p-3 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-red-600">
              {partido.tipo === "final"
                ? `${partido.phase} · ${partido.title}`
                : "Clasificación"}
            </p>

            <p className="mt-2 break-words text-sm font-black leading-tight text-slate-950">
              {partido.home_name} vs {partido.away_name}
            </p>

            <p className="mt-2 text-xs font-bold text-slate-500">
              {formatearFechaCorta(partido.match_date)} ·{" "}
              {partido.match_time ?? "Hora pendiente"} ·{" "}
              {partido.field ?? "Campo pendiente"}
            </p>
          </div>

          <div className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-center text-white">
            <p className="text-sm font-black">{marcadorTexto(partido)}</p>
          </div>
        </div>

        {puedeVerActa && (
          <Link
            href={`/acta-partido?match=${partido.id}&type=${tipoActa(partido)}`}
            className="mt-3 block rounded-xl bg-red-600 py-2 text-center text-xs font-black uppercase text-white shadow"
          >
            Ver acta
          </Link>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />

        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-white/95 p-5 font-bold shadow">
            Cargando equipo...
          </div>
        </section>
      </main>
    );
  }

  if (!equipo) {
    return (
      <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />

        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-white/95 p-5 shadow">
            <p className="font-bold">
              {errorCarga || "Equipo no encontrado."}
            </p>

            <Link
              href="/equipos"
              className="mt-4 inline-block font-black text-red-600"
            >
              ← Volver a equipos
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const colorLocal = equipo.home_color || "#047857";
  const colorVisitante = equipo.away_color || "#dc2626";
  const esFavorito = favoritos.includes(equipo.id);

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

          <h1 className="mt-2 break-words text-center text-3xl font-black leading-tight">
            {equipo.name}
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Equipo participante
          </p>
        </div>

        <button
          onClick={toggleFavorito}
          className={`mt-5 w-full rounded-2xl py-4 text-center text-base font-black shadow-2xl ${
            esFavorito
              ? "bg-red-600 text-white"
              : "bg-white/95 text-slate-900"
          }`}
        >
          {esFavorito ? "★ Equipo favorito" : "☆ Añadir a favoritos"}
        </button>

        <div className="mt-5 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
          <button
            type="button"
            onClick={() => setCalendarioAbierto((actual) => !actual)}
            className="flex w-full items-center justify-between gap-4 bg-red-600 p-5 text-left text-white"
          >
            <div>
              <h2 className="text-xl font-black">Calendario del equipo</h2>

              <p className="mt-1 text-sm font-bold text-red-100">
                Resultados y próximos partidos
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-black text-white">
              {calendarioAbierto ? "−" : "+"}
            </div>
          </button>

          {calendarioAbierto && (
            <div className="border-t border-slate-200 p-5 pt-4">
              {partidosEquipo.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                  Este equipo todavía no tiene partidos asignados.
                </p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
                        Últimos resultados
                      </h3>

                      <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                        {resultadosEquipo.length}
                      </p>
                    </div>

                    {resultadosEquipo.length === 0 ? (
                      <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                        Todavía no hay resultados registrados.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {resultadosEquipo.map((partido) =>
                          renderPartidoEquipo(partido),
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
                        Próximos partidos
                      </h3>

                      <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                        {proximosPartidosEquipo.length}
                      </p>
                    </div>

                    {proximosPartidosEquipo.length === 0 ? (
                      <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                        No hay próximos partidos pendientes.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {proximosPartidosEquipo.map((partido) =>
                          renderPartidoEquipo(partido),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <h2 className="text-xl font-black">Equipaciones</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <div className="flex justify-center">
                <ShirtIcon color={colorLocal} />
              </div>

              <p className="mt-2 text-sm font-black text-slate-700">Local</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <div className="flex justify-center">
                <ShirtIcon color={colorVisitante} />
              </div>

              <p className="mt-2 text-sm font-black text-slate-700">
                Visitante
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Plantilla</h2>

            <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
              {jugadores.length}
            </p>
          </div>

          {jugadores.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
              Este equipo todavía no tiene jugadores añadidos.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {jugadores.map((player) => {
                const tipo = normalizarTipoJugador(player.player_type);
                const esJugadorFavorito = jugadoresFavoritos.includes(
                  player.id,
                );
                const abierto = jugadoresAbiertos.includes(player.id);
                const stats = statsJugador(player.id);

                return (
                  <div
                    key={player.id}
                    className="rounded-3xl bg-slate-50 p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-red-600 text-2xl font-black text-white shadow">
                        {player.number ?? "-"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-[1.15rem] font-black leading-tight text-slate-950">
                          {player.name}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <button
                        onClick={() => toggleJugadorAbierto(player.id)}
                        className={`flex h-12 w-full items-center justify-center rounded-2xl text-xl font-black shadow ${
                          abierto
                            ? "bg-red-600 text-white"
                            : "bg-white text-slate-600"
                        }`}
                        aria-label={
                          abierto
                            ? "Ocultar estadísticas del jugador"
                            : "Ver estadísticas del jugador"
                        }
                      >
                        {abierto ? "−" : "+"}
                      </button>

                      <div
                        className={`flex h-12 w-full items-center justify-center rounded-2xl text-sm font-black shadow ${claseTipoJugador(
                          tipo,
                        )}`}
                      >
                        {tipo}
                      </div>

                      <button
                        onClick={() => toggleJugadorFavorito(player.id)}
                        className={`flex h-12 w-full items-center justify-center rounded-2xl text-2xl font-black shadow ${
                          esJugadorFavorito
                            ? "bg-yellow-300 text-slate-950"
                            : "bg-white text-slate-400"
                        }`}
                        aria-label={
                          esJugadorFavorito
                            ? "Quitar jugador de favoritos"
                            : "Añadir jugador a favoritos"
                        }
                      >
                        {esJugadorFavorito ? "★" : "☆"}
                      </button>
                    </div>

                    {abierto && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Jugados
                          </p>
                          <p className="mt-1 text-2xl font-black text-slate-950">
                            {stats.played}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Goles
                          </p>
                          <p className="mt-1 text-2xl font-black text-red-600">
                            {stats.goals}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Amarillas
                          </p>
                          <p className="mt-1 text-2xl font-black text-yellow-500">
                            {stats.yellow}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Rojas
                          </p>
                          <p className="mt-1 text-2xl font-black text-red-700">
                            {stats.red}
                          </p>
                        </div>

                        <div className="col-span-2 rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Sanciones
                          </p>
                          <p className="mt-1 text-2xl font-black text-slate-950">
                            {stats.suspensions}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}