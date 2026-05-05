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

type Match = {
  id: string;
  match_date: string;
  match_time: string;
  field: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  mvp_open: boolean | null;
  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
  home_team: { id: string; name: string }[] | { id: string; name: string } | null;
  away_team: { id: string; name: string }[] | { id: string; name: string } | null;
};

type Vote = {
  id: string;
  match_id: string;
  user_id: string;
  player_id: string;
  team_id: string | null;
};

function normalizarEquipo(
  equipo: RawMatch["home_team"]
): { id: string; name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function getUserId() {
  let userId = localStorage.getItem("torneo_user_id");

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("torneo_user_id", userId);
  }

  return userId;
}

function fechaLocalHoy() {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, "0");
  const day = String(ahora.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function horaLocalActual() {
  const ahora = new Date();
  const hours = String(ahora.getHours()).padStart(2, "0");
  const minutes = String(ahora.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export default function FavoritosPage() {
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [equipoAbierto, setEquipoAbierto] = useState("");

  useEffect(() => {
    const guardados = localStorage.getItem("equiposFavoritos");
    const userId = getUserId();

    if (guardados) {
      try {
        setFavoritos(JSON.parse(guardados));
      } catch {
        localStorage.removeItem("equiposFavoritos");
        setFavoritos([]);
      }
    }

    async function cargarDatos() {
      setLoading(true);
      setErrorCarga("");

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .order("name", { ascending: true });

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`
          id,
          match_date,
          match_time,
          field,
          home_score,
          away_score,
          status,
          mvp_open,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true });

      const { data: votesData, error: votesError } = await supabase
        .from("mvp_votes")
        .select("id, match_id, user_id, player_id, team_id")
        .eq("user_id", userId);

      if (teamsError || matchesError || votesError) {
        setErrorCarga("No se han podido cargar tus favoritos.");
        setLoading(false);
        return;
      }

      const partidosNormalizados: Match[] = (
        (matchesData as unknown as RawMatch[]) || []
      ).map((match) => ({
        ...match,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      }));

      setTeams((teamsData ?? []) as Team[]);
      setMatches(partidosNormalizados);
      setVotes((votesData ?? []) as Vote[]);
      setLoading(false);
    }

    cargarDatos();
  }, []);

  const equiposFavoritos = teams.filter((team) => favoritos.includes(team.id));
  const usarAcordeon = equiposFavoritos.length > 1;

  function partidosDelEquipo(teamId: string) {
    return matches.filter(
      (match) => match.home_team?.id === teamId || match.away_team?.id === teamId
    );
  }

  function partidoEsFuturo(match: Match) {
    const hoy = fechaLocalHoy();
    const horaActual = horaLocalActual();

    if (match.match_date > hoy) return true;
    if (match.match_date === hoy && match.match_time >= horaActual) return true;

    return false;
  }

  function proximosDelEquipo(teamId: string) {
    return partidosDelEquipo(teamId).filter(
      (match) =>
        (match.home_score === null || match.away_score === null) &&
        partidoEsFuturo(match)
    );
  }

  function resultadosDelEquipo(teamId: string) {
    return partidosDelEquipo(teamId).filter(
      (match) => match.home_score !== null && match.away_score !== null
    );
  }

  function votoEmitido(matchId: string, teamId: string) {
    return votes.some(
      (vote) => vote.match_id === matchId && vote.team_id === teamId
    );
  }

  function quitarFavorito(teamId: string) {
    const nuevosFavoritos = favoritos.filter((id) => id !== teamId);
    setFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));

    if (equipoAbierto === teamId) {
      setEquipoAbierto("");
    }
  }

  function renderEstadoMvp(match: Match, teamId: string) {
    const yaVotado = votoEmitido(match.id, teamId);

    if (yaVotado) {
      return (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-800">
          ✅ Voto emitido
        </div>
      );
    }

    if (match.mvp_open) {
      return (
        <a
          href={`/votar-mvp?match=${match.id}`}
          className="mt-3 block rounded-xl bg-red-600 px-3 py-2 text-center text-sm font-black text-white shadow"
        >
          Votar MVP
        </a>
      );
    }

    return null;
  }

  function renderPartido(
    match: Match,
    teamId: string,
    tipo: "proximo" | "resultado"
  ) {
    return (
      <div key={match.id} className="rounded-2xl bg-slate-50 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="break-words text-base font-black leading-tight">
              {match.home_team?.name}
            </p>
            <p className="text-xs font-black uppercase text-slate-400">vs</p>
            <p className="break-words text-base font-black leading-tight">
              {match.away_team?.name}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-slate-950 px-3 py-2 text-center text-white shadow">
            {tipo === "resultado" ? (
              <p className="text-2xl font-black">
                {match.home_score} - {match.away_score}
              </p>
            ) : (
              <p className="text-lg font-black text-red-400">
                {match.match_time}
              </p>
            )}

            <p className="text-xs font-bold text-slate-300">{match.field}</p>
          </div>
        </div>

        <p className="mt-3 text-sm font-bold text-slate-500">
          {formatearFecha(match.match_date)}
        </p>

        {renderEstadoMvp(match, teamId)}
      </div>
    );
  }

  function renderContenidoEquipo(team: Team) {
    const proximos = proximosDelEquipo(team.id);
    const resultados = resultadosDelEquipo(team.id);

    return (
      <div className="space-y-5 p-4">
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
              proximos.map((match) => renderPartido(match, team.id, "proximo"))
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
              resultados.map((match) => renderPartido(match, team.id, "resultado"))
            )}
          </div>
        </div>
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
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
            Cargando favoritos...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 font-bold text-red-700 shadow-2xl">
            {errorCarga}
          </div>
        ) : equiposFavoritos.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl">
            <p className="text-sm font-bold text-slate-500">
              Todavía no tienes equipos favoritos. Entra en Equipos y pulsa la
              estrella para seguirlos.
            </p>

            <Link
              href="/equipos"
              className="mt-4 block rounded-xl bg-red-600 py-3 text-center text-sm font-black text-white shadow"
            >
              Ir a equipos
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {equiposFavoritos.map((team) => {
              const abierto = !usarAcordeon || equipoAbierto === team.id;

              return (
                <div
                  key={team.id}
                  className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl"
                >
                  <button
                    onClick={() => {
                      if (!usarAcordeon) return;
                      setEquipoAbierto(abierto ? "" : team.id);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left ${
                      abierto ? "bg-red-600 text-white" : "bg-white text-slate-900"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="break-words text-lg font-black leading-tight">
                        {team.name}
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          abierto ? "text-red-100" : "text-slate-500"
                        }`}
                      >
                        {team.group_name}
                      </p>
                    </div>

                    {usarAcordeon && (
                      <span className="shrink-0 text-2xl font-black">
                        {abierto ? "−" : "+"}
                      </span>
                    )}
                  </button>

                  {abierto && (
                    <>
                      <div className="border-t border-white/20 bg-red-600 px-5 pb-4">
                        <button
                          onClick={() => quitarFavorito(team.id)}
                          className="w-full rounded-xl bg-white/20 py-3 text-sm font-black text-white shadow"
                        >
                          Quitar de favoritos
                        </button>
                      </div>

                      {renderContenidoEquipo(team)}
                    </>
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