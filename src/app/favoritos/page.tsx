"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
  home_team: { id: string; name: string }[] | { id: string; name: string } | null;
  away_team: { id: string; name: string }[] | { id: string; name: string } | null;
};

function normalizarEquipo(
  equipo: RawMatch["home_team"]
): { id: string; name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

export default function FavoritosPage() {
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [equipoAbierto, setEquipoAbierto] = useState("");

  useEffect(() => {
    const guardados = localStorage.getItem("equiposFavoritos");
    const ids = guardados ? JSON.parse(guardados) : [];
    setFavoritos(ids);

    async function cargarDatos() {
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .order("name", { ascending: true });

      const { data: matchesData } = await supabase
        .from("matches")
        .select(`
          id,
          match_date,
          match_time,
          field,
          home_score,
          away_score,
          status,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true });

      const partidosNormalizados: Match[] = (
        (matchesData as unknown as RawMatch[]) || []
      ).map((match) => ({
        ...match,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      }));

      const equipos = (teamsData ?? []) as Team[];

      setTeams(equipos);
      setMatches(partidosNormalizados);

      const primerFavorito = equipos.find((team) => ids.includes(team.id));
      if (primerFavorito) {
        setEquipoAbierto("");
      }
    }

    cargarDatos();
  }, []);

  const equiposFavoritos = teams.filter((team) => favoritos.includes(team.id));

  function partidosDelEquipo(teamId: string) {
    return matches.filter(
      (match) => match.home_team?.id === teamId || match.away_team?.id === teamId
    );
  }

  function proximosDelEquipo(teamId: string) {
    return partidosDelEquipo(teamId).filter(
      (match) => match.home_score === null || match.away_score === null
    );
  }

  function resultadosDelEquipo(teamId: string) {
    return partidosDelEquipo(teamId).filter(
      (match) => match.home_score !== null && match.away_score !== null
    );
  }

  function quitarFavorito(teamId: string) {
    const nuevosFavoritos = favoritos.filter((id) => id !== teamId);
    setFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));

    if (equipoAbierto === teamId) {
      setEquipoAbierto(nuevosFavoritos[0] ?? "");
    }
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

        {equiposFavoritos.length === 0 ? (
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
              const proximos = proximosDelEquipo(team.id);
              const resultados = resultadosDelEquipo(team.id);

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
                        {team.group_name}
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
                            proximos.map((match) => (
                              <div
                                key={match.id}
                                className="rounded-2xl bg-slate-50 p-4 shadow-sm"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="text-base font-black leading-tight">
                                      {match.home_team?.name}
                                    </p>
                                    <p className="text-xs font-black uppercase text-slate-400">
                                      vs
                                    </p>
                                    <p className="text-base font-black leading-tight">
                                      {match.away_team?.name}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-center text-white shadow">
                                    <p className="text-lg font-black text-red-400">
                                      {match.match_time}
                                    </p>
                                    <p className="text-xs font-bold text-slate-300">
                                      {match.field}
                                    </p>
                                  </div>
                                </div>

                                <p className="mt-3 text-sm font-bold text-slate-500">
                                  {match.match_date}
                                </p>
                              </div>
                            ))
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
                            resultados.map((match) => (
                              <div
                                key={match.id}
                                className="rounded-2xl bg-slate-50 p-4 shadow-sm"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="text-base font-black leading-tight">
                                      {match.home_team?.name}
                                    </p>
                                    <p className="text-xs font-black uppercase text-slate-400">
                                      vs
                                    </p>
                                    <p className="text-base font-black leading-tight">
                                      {match.away_team?.name}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-center text-white shadow">
                                    <p className="text-2xl font-black">
                                      {match.home_score} - {match.away_score}
                                    </p>
                                    <p className="text-xs font-bold text-slate-300">
                                      {match.field}
                                    </p>
                                  </div>
                                </div>

                                <p className="mt-3 text-sm font-bold text-slate-500">
                                  {match.match_date}
                                </p>
                              </div>
                            ))
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