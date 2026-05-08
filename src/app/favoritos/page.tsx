"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type TabActiva = "equipos" | "jugadores";

type Team = {
  id: string;
  name: string;
};

type TeamRef = {
  id: string;
  name: string;
};

type RawGroupMatch = {
  id: string;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  mvp_open: boolean | null;
  home_team: TeamRef[] | TeamRef | null;
  away_team: TeamRef[] | TeamRef | null;
};

type GroupMatch = {
  id: string;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  mvp_open: boolean | null;
  home_team: TeamRef | null;
  away_team: TeamRef | null;
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
};

type DisplayMatch = {
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
  mvp_open: boolean | null;
  sort_order: number;
};

type Vote = {
  id: string;
  match_id: string | null;
  final_match_id: string | null;
  user_id: string;
};

type TableRow = {
  teamId: string;
  teamName: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function getUserId() {
  let userId = localStorage.getItem("torneo_user_id");

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("torneo_user_id", userId);
  }

  return userId;
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

function ordenarPartidos(partidos: DisplayMatch[]) {
  return [...partidos].sort((a, b) => {
    const fechaA = a.match_date ?? "9999-12-31";
    const fechaB = b.match_date ?? "9999-12-31";

    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);

    const horaA = a.match_time ?? "99:99";
    const horaB = b.match_time ?? "99:99";

    if (horaA !== horaB) return horaA.localeCompare(horaB);

    return a.sort_order - b.sort_order;
  });
}

function marcadorTexto(match: DisplayMatch) {
  if (match.home_score === null || match.away_score === null) {
    return "vs";
  }

  const marcador = `${match.home_score} - ${match.away_score}`;

  if (
    match.tipo === "final" &&
    match.home_penalties !== null &&
    match.away_penalties !== null
  ) {
    return `${marcador} · Pen. ${match.home_penalties}-${match.away_penalties}`;
  }

  return marcador;
}

function calcularClasificacion(teams: Team[], matches: GroupMatch[]) {
  const tabla: TableRow[] = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    pj: 0,
    g: 0,
    e: 0,
    p: 0,
    gf: 0,
    gc: 0,
    dg: 0,
    pts: 0,
  }));

  matches.forEach((match) => {
    if (match.home_score === null || match.away_score === null) return;

    const local = tabla.find((row) => row.teamId === match.home_team_id);
    const visitante = tabla.find((row) => row.teamId === match.away_team_id);

    if (!local || !visitante) return;

    local.pj += 1;
    visitante.pj += 1;

    local.gf += match.home_score;
    local.gc += match.away_score;

    visitante.gf += match.away_score;
    visitante.gc += match.home_score;

    if (match.home_score > match.away_score) {
      local.g += 1;
      visitante.p += 1;
      local.pts += 3;
    } else if (match.home_score < match.away_score) {
      visitante.g += 1;
      local.p += 1;
      visitante.pts += 3;
    } else {
      local.e += 1;
      visitante.e += 1;
      local.pts += 1;
      visitante.pts += 1;
    }

    local.dg = local.gf - local.gc;
    visitante.dg = visitante.gf - visitante.gc;
  });

  return tabla.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    if (a.gc !== b.gc) return a.gc - b.gc;
    return a.teamName.localeCompare(b.teamName);
  });
}

export default function FavoritosPage() {
  const [tabActiva, setTabActiva] = useState<TabActiva>("equipos");
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [finalMatches, setFinalMatches] = useState<FinalMatch[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userId, setUserId] = useState("");
  const [equipoAbierto, setEquipoAbierto] = useState("");
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const usuario = getUserId();
    setUserId(usuario);

    try {
      const guardados = localStorage.getItem("equiposFavoritos");
      const ids = guardados ? JSON.parse(guardados) : [];
      setFavoritos(Array.isArray(ids) ? ids : []);
    } catch {
      localStorage.removeItem("equiposFavoritos");
      setFavoritos([]);
    }

    cargarDatos(usuario);
  }, []);

  async function cargarDatos(usuario: string) {
    setLoading(true);
    setMensaje("");

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .order("name", { ascending: true });

    if (teamsError) {
      console.error("Error cargando equipos:", teamsError);
      setMensaje("No se han podido cargar los equipos favoritos.");
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
        home_team_id,
        away_team_id,
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
        mvp_open
      `
      )
      .order("sort_order", { ascending: true });

    if (finalError) {
      console.error("Error cargando eliminatorias:", finalError);
      setMensaje("No se han podido cargar las eliminatorias.");
      setLoading(false);
      return;
    }

    const { data: votesData, error: votesError } = await supabase
      .from("mvp_votes")
      .select("id, match_id, final_match_id, user_id")
      .eq("user_id", usuario);

    if (votesError) {
      console.error("Error cargando votos:", votesError);
      setMensaje("No se han podido cargar tus votos MVP.");
      setLoading(false);
      return;
    }

    const partidosNormalizados: GroupMatch[] = (
      (matchesData as unknown as RawGroupMatch[]) || []
    ).map((match) => ({
      ...match,
      home_team: normalizarEquipo(match.home_team),
      away_team: normalizarEquipo(match.away_team),
    }));

    setTeams((teamsData ?? []) as Team[]);
    setMatches(partidosNormalizados);
    setFinalMatches((finalData ?? []) as FinalMatch[]);
    setVotes((votesData ?? []) as Vote[]);
    setLoading(false);
  }

  const clasificacion = useMemo(
    () => calcularClasificacion(teams, matches),
    [teams, matches]
  );

  const equiposFavoritos = teams.filter((team) => favoritos.includes(team.id));

  function posicionEquipo(teamId: string) {
    const index = clasificacion.findIndex((row) => row.teamId === teamId);
    if (index === -1) return null;

    const row = clasificacion[index];

    return {
      posicion: index + 1,
      pts: row.pts,
    };
  }

  function partidosDelEquipo(team: Team) {
    const partidosGrupo: DisplayMatch[] = matches
      .filter(
        (match) =>
          match.home_team_id === team.id || match.away_team_id === team.id
      )
      .map((match, index) => ({
        id: match.id,
        tipo: "grupo",
        phase: "Clasificación",
        title: "Clasificación",
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_name: match.home_team?.name ?? "Local",
        away_name: match.away_team?.name ?? "Visitante",
        home_score: match.home_score,
        away_score: match.away_score,
        home_penalties: null,
        away_penalties: null,
        status: match.status,
        mvp_open: match.mvp_open,
        sort_order: index + 1,
      }));

    const nombreEquipo = normalizarTexto(team.name);

    const partidosFinales: DisplayMatch[] = finalMatches
      .filter(
        (match) =>
          normalizarTexto(match.home_ref) === nombreEquipo ||
          normalizarTexto(match.away_ref) === nombreEquipo
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
        mvp_open: match.mvp_open,
        sort_order: match.sort_order,
      }));

    return ordenarPartidos([...partidosGrupo, ...partidosFinales]);
  }

  function quitarFavorito(teamId: string) {
    const nuevosFavoritos = favoritos.filter((id) => id !== teamId);

    setFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));

    if (equipoAbierto === teamId) {
      setEquipoAbierto("");
    }
  }

  function votoEmitido(match: DisplayMatch) {
    if (match.tipo === "final") {
      return votes.some(
        (vote) =>
          vote.final_match_id === match.id && vote.user_id === userId
      );
    }

    return votes.some(
      (vote) => vote.match_id === match.id && vote.user_id === userId
    );
  }

  function renderMvp(match: DisplayMatch) {
    if (!match.mvp_open) return null;

    if (votoEmitido(match)) {
      return (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-800">
          ✅ Voto emitido
        </div>
      );
    }

    return (
      <Link
        href={`/votar-mvp?match=${match.id}&type=${
          match.tipo === "final" ? "final" : "grupo"
        }`}
        className="mt-3 block rounded-xl bg-red-600 px-3 py-2 text-center text-sm font-black text-white shadow"
      >
        Votar MVP
      </Link>
    );
  }

  return (
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

          <h1 className="mt-2 text-center text-3xl font-black">Favoritos</h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Tus equipos y jugadores favoritos
          </p>
        </div>

        <Link
          href="/inicio"
          className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
        >
          Volver al inicio
        </Link>

        <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl bg-white/95 p-1 shadow-2xl">
          <button
            onClick={() => setTabActiva("equipos")}
            className={`rounded-xl px-3 py-3 text-sm font-black ${
              tabActiva === "equipos"
                ? "bg-red-600 text-white"
                : "text-slate-500"
            }`}
          >
            Equipos
          </button>

          <button
            onClick={() => setTabActiva("jugadores")}
            className={`rounded-xl px-3 py-3 text-sm font-black ${
              tabActiva === "jugadores"
                ? "bg-red-600 text-white"
                : "text-slate-500"
            }`}
          >
            Jugadores
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
            Cargando favoritos...
          </div>
        ) : mensaje ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 font-bold text-red-700 shadow-2xl">
            {mensaje}
          </div>
        ) : tabActiva === "equipos" ? (
          equiposFavoritos.length === 0 ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl">
              <p className="text-sm font-bold text-slate-500">
                Todavía no tienes equipos favoritos. Entra en Equipos y pulsa la
                estrella para seguirlos.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {equiposFavoritos.map((team) => {
                const abierto = equipoAbierto === team.id;
                const partidos = partidosDelEquipo(team);
                const posicion = posicionEquipo(team.id);

                return (
                  <div
                    key={team.id}
                    className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur"
                  >
                    <button
                      onClick={() =>
                        setEquipoAbierto(abierto ? "" : team.id)
                      }
                      className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left ${
                        abierto ? "bg-red-600 text-white" : "bg-white text-slate-900"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="break-words text-xl font-black leading-tight">
                          {team.name}
                        </p>

                        {posicion && (
                          <p
                            className={`mt-1 text-sm font-bold ${
                              abierto ? "text-red-100" : "text-slate-500"
                            }`}
                          >
                            {posicion.posicion}º en clasificación ·{" "}
                            {posicion.pts} pts
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 text-3xl font-black">
                        {abierto ? "−" : "+"}
                      </span>
                    </button>

                    {abierto && (
                      <div className="space-y-5 p-4">
                        <button
                          onClick={() => quitarFavorito(team.id)}
                          className="w-full rounded-xl bg-slate-950 py-3 text-sm font-black text-white shadow"
                        >
                          Quitar de favoritos
                        </button>

                        <div>
                          <div className="mb-3 rounded-xl bg-slate-950 px-4 py-3 text-white">
                            <p className="text-center text-sm font-black uppercase tracking-widest">
                              Partidos
                            </p>
                          </div>

                          {partidos.length === 0 ? (
                            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                              Todavía no hay partidos asignados a este equipo.
                            </p>
                          ) : (
                            <div className="divide-y divide-slate-200">
                              {partidos.map((match) => {
                                const hayResultado =
                                  match.home_score !== null &&
                                  match.away_score !== null;

                                return (
                                  <div
                                    key={`${match.tipo}-${match.id}`}
                                    className="py-3 first:pt-0 last:pb-0"
                                  >
                                    <div className="rounded-2xl bg-slate-50 p-4 shadow-sm">
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-black uppercase tracking-widest text-red-600">
                                          {match.tipo === "final"
                                            ? match.phase
                                            : "Clasificación"}
                                        </p>

                                        <p className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-[11px] font-black text-slate-600">
                                          {estadoBonito(match.status)}
                                        </p>
                                      </div>

                                      {match.tipo === "final" && (
                                        <p className="mt-1 text-sm font-black text-slate-500">
                                          {match.title}
                                        </p>
                                      )}

                                      <div className="mt-3 grid grid-cols-[1fr_52px_1fr] items-center gap-2">
                                        <p className="break-words text-center text-sm font-black leading-tight text-slate-950">
                                          {match.home_name}
                                        </p>

                                        <div className="rounded-xl bg-slate-950 px-1 py-2 text-center text-white shadow">
                                          <p
                                            className={`font-black leading-none ${
                                              hayResultado
                                                ? "text-base"
                                                : "text-sm uppercase"
                                            }`}
                                          >
                                            {marcadorTexto(match)}
                                          </p>
                                        </div>

                                        <p className="break-words text-center text-sm font-black leading-tight text-slate-950">
                                          {match.away_name}
                                        </p>
                                      </div>

                                      <p className="mt-3 text-sm font-bold text-slate-500">
                                        {formatearFechaSegura(match.match_date)} ·{" "}
                                        {match.match_time ?? "Hora pendiente"} ·{" "}
                                        {match.field ?? "Campo pendiente"}
                                      </p>

                                      {renderMvp(match)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl">
            <p className="text-lg font-black text-slate-950">
              Jugadores favoritos
            </p>

            <p className="mt-2 text-sm font-bold text-slate-500">
              Próximamente podrás marcar jugadores como favoritos desde la
              plantilla de cada equipo.
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-700">
                La idea será mostrar aquí:
              </p>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="text-xs font-black text-slate-400">PJ</p>
                  <p className="text-xl font-black">0</p>
                </div>

                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="text-xs font-black text-slate-400">G</p>
                  <p className="text-xl font-black">0</p>
                </div>

                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="text-xs font-black text-slate-400">TA</p>
                  <p className="text-xl font-black">0</p>
                </div>

                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="text-xs font-black text-slate-400">TR</p>
                  <p className="text-xl font-black">0</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}