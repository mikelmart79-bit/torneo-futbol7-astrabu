"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

type TeamRef = {
  id: string;
  name: string;
};

type GroupMatch = {
  id: string;
  tipo: "grupo";
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

type RawGroupMatch = Omit<GroupMatch, "tipo" | "home_team" | "away_team"> & {
  home_team: TeamRef[] | TeamRef | null;
  away_team: TeamRef[] | TeamRef | null;
};

type FinalMatch = {
  id: string;
  tipo: "final";
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
};

type Vote = {
  id: string;
  match_id: string | null;
  final_match_id: string | null;
  user_id: string;
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

function ordenarPartidos(partidos: DisplayMatch[]) {
  return [...partidos].sort((a, b) => {
    const fechaA = a.match_date ?? "9999-12-31";
    const fechaB = b.match_date ?? "9999-12-31";

    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);

    const horaA = a.match_time ?? "99:99";
    const horaB = b.match_time ?? "99:99";

    if (horaA !== horaB) return horaA.localeCompare(horaB);

    return a.title.localeCompare(b.title);
  });
}

function estadoBonito(status: string | null) {
  if (!status) return "Pendiente";

  if (status === "pending") return "Pendiente";
  if (status === "live") return "En juego";
  if (status === "finished") return "Finalizado";
  if (status === "closed") return "Cerrado";

  return status;
}

export default function FavoritosPage() {
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

    const guardados = localStorage.getItem("equiposFavoritos");
    const ids = guardados ? JSON.parse(guardados) : [];
    setFavoritos(ids);

    cargarDatos(usuario);
  }, []);

  async function cargarDatos(usuario: string) {
    setLoading(true);
    setMensaje("");

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name")
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
      tipo: "grupo" as const,
      home_team: normalizarEquipo(match.home_team),
      away_team: normalizarEquipo(match.away_team),
    }));

    setTeams((teamsData ?? []) as Team[]);
    setMatches(partidosNormalizados);
    setFinalMatches(((finalData ?? []) as FinalMatch[]).map((match) => ({
      ...match,
      tipo: "final" as const,
    })));
    setVotes((votesData ?? []) as Vote[]);
    setLoading(false);
  }

  const equiposFavoritos = teams.filter((team) => favoritos.includes(team.id));

  function partidosDelEquipo(team: Team) {
    const partidosGrupo: DisplayMatch[] = matches
      .filter(
        (match) =>
          match.home_team?.id === team.id || match.away_team?.id === team.id
      )
      .map((match) => ({
        id: match.id,
        tipo: "grupo" as const,
        phase: "Clasificación",
        title: match.group_name ?? "Clasificación",
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
      }));

    const eliminatorias: DisplayMatch[] = finalMatches
      .filter(
        (match) =>
          normalizarTexto(match.home_ref) === normalizarTexto(team.name) ||
          normalizarTexto(match.away_ref) === normalizarTexto(team.name)
      )
      .map((match) => ({
        id: match.id,
        tipo: "final" as const,
        phase: match.phase,
        title: match.title,
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_name: match.home_ref,
        away_name: match.away_ref,
        home_score: match.home_score,
        away_score: match.away_score,
        home_penalties: match.home_penalties,
        away_penalties: match.away_penalties,
        status: match.status,
        mvp_open: match.mvp_open,
      }));

    return ordenarPartidos([...partidosGrupo, ...eliminatorias]);
  }

  function proximosDelEquipo(team: Team) {
    return partidosDelEquipo(team).filter(
      (match) => match.home_score === null || match.away_score === null
    );
  }

  function resultadosDelEquipo(team: Team) {
    return partidosDelEquipo(team).filter(
      (match) => match.home_score !== null && match.away_score !== null
    );
  }

  function votoEmitido(match: DisplayMatch) {
    return votes.some((vote) => {
      if (vote.user_id !== userId) return false;

      if (match.tipo === "final") {
        return vote.final_match_id === match.id;
      }

      return vote.match_id === match.id;
    });
  }

  function quitarFavorito(teamId: string) {
    const nuevosFavoritos = favoritos.filter((id) => id !== teamId);

    setFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));

    if (equipoAbierto === teamId) {
      setEquipoAbierto("");
    }
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

  function renderMarcador(match: DisplayMatch) {
    if (match.home_score === null || match.away_score === null) {
      return (
        <>
          <p className="text-lg font-black text-red-400">
            {match.match_time ?? "--:--"}
          </p>

          <p className="text-xs font-bold text-slate-300">
            {match.field ?? "Campo"}
          </p>
        </>
      );
    }

    return (
      <>
        <p className="text-2xl font-black">
          {match.home_score} - {match.away_score}
        </p>

        {match.tipo === "final" &&
          match.home_penalties !== null &&
          match.away_penalties !== null && (
            <p className="text-xs font-bold text-amber-300">
              Pen. {match.home_penalties}-{match.away_penalties}
            </p>
          )}

        <p className="text-xs font-bold text-slate-300">
          {match.field ?? "Campo"}
        </p>
      </>
    );
  }

  function renderPartido(match: DisplayMatch) {
    return (
      <div
        key={`${match.tipo}-${match.id}`}
        className="rounded-2xl bg-slate-50 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs font-black uppercase text-red-600">
              {match.tipo === "final"
                ? `${match.phase} · ${match.title}`
                : match.title}
            </p>

            <p className="mt-2 text-base font-black leading-tight">
              {match.home_name}
            </p>

            <p className="text-xs font-black uppercase text-slate-400">vs</p>

            <p className="text-base font-black leading-tight">
              {match.away_name}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 px-3 py-2 text-center text-white shadow">
            {renderMarcador(match)}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-500">
            {formatearFechaSegura(match.match_date)}
          </p>

          <p className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
            {estadoBonito(match.status)}
          </p>
        </div>

        {renderMvp(match)}
      </div>
    );
  }

  return (
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

          <h1 className="mt-2 text-center text-3xl font-black">Favoritos</h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Tus equipos, partidos y votaciones MVP
          </p>
        </div>

        <Link
          href="/inicio"
          className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
        >
          Volver al inicio
        </Link>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
            Cargando favoritos...
          </div>
        ) : mensaje ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 text-sm font-bold text-red-700 shadow-2xl">
            {mensaje}
          </div>
        ) : equiposFavoritos.length === 0 ? (
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
              const proximos = proximosDelEquipo(team);
              const resultados = resultadosDelEquipo(team);

              return (
                <div
                  key={team.id}
                  className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl"
                >
                  <button
                    onClick={() => setEquipoAbierto(abierto ? "" : team.id)}
                    className={`flex w-full items-center justify-between px-5 py-4 text-left ${
                      abierto
                        ? "bg-red-600 text-white"
                        : "bg-white/95 text-slate-900"
                    }`}
                  >
                    <div>
                      <p className="text-lg font-black">{team.name}</p>

                      <p
                        className={`text-sm font-bold ${
                          abierto ? "text-red-100" : "text-slate-500"
                        }`}
                      >
                        {team.group_name ?? "Clasificación"}
                      </p>
                    </div>

                    <span className="text-2xl font-black">
                      {abierto ? "−" : "+"}
                    </span>
                  </button>

                  {abierto && (
                    <div className="space-y-5 p-4">
                      <button
                        onClick={() => quitarFavorito(team.id)}
                        className="w-full rounded-xl bg-slate-900 py-3 text-sm font-black text-white shadow"
                      >
                        Quitar de favoritos
                      </button>

                      <div>
                        <div className="mb-3 rounded-xl bg-slate-950 px-4 py-3 text-white">
                          <p className="text-sm font-black uppercase tracking-widest">
                            Próximos partidos
                          </p>
                        </div>

                        <div className="space-y-3">
                          {proximos.length === 0 ? (
                            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                              No hay próximos partidos de este equipo.
                            </p>
                          ) : (
                            proximos.map((match) => renderPartido(match))
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 rounded-xl bg-red-600 px-4 py-3 text-white">
                          <p className="text-sm font-black uppercase tracking-widest">
                            Resultados
                          </p>
                        </div>

                        <div className="space-y-3">
                          {resultados.length === 0 ? (
                            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                              Todavía no hay resultados de este equipo.
                            </p>
                          ) : (
                            resultados.map((match) => renderPartido(match))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}