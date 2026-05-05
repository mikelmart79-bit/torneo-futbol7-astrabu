"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type TeamRef = {
  id: string;
  name: string;
};

type Match = {
  id: string;
  group_name: string;
  match_date: string;
  match_time: string;
  field: string;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  mvp_open: boolean | null;
  home_team: TeamRef | null;
  away_team: TeamRef | null;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
  home_team: TeamRef[] | TeamRef | null;
  away_team: TeamRef[] | TeamRef | null;
};

type Vote = {
  id: string;
  match_id: string;
  user_id: string;
  player_id: string;
  team_id: string | null;
};

function normalizarEquipo(equipo: RawMatch["home_team"]): TeamRef | null {
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

function estadoBonito(status: string | null) {
  if (!status) return "Pendiente";

  if (status === "pending") return "Pendiente";
  if (status === "live") return "En juego";
  if (status === "finished") return "Finalizado";
  if (status === "closed") return "Cerrado";

  return status;
}

export default function PartidosPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    async function cargarPartidos() {
      setLoading(true);
      setErrorCarga("");

      const userId = getUserId();

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(
          `
          id,
          group_name,
          match_date,
          match_time,
          field,
          status,
          home_score,
          away_score,
          mvp_open,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `
        )
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true });

      const { data: votesData, error: votesError } = await supabase
        .from("mvp_votes")
        .select("id, match_id, user_id, player_id, team_id")
        .eq("user_id", userId);

      if (matchesError || votesError) {
        console.error(matchesError || votesError);
        setErrorCarga("No se han podido cargar los partidos.");
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

      setMatches(partidosNormalizados);
      setVotes((votesData ?? []) as Vote[]);
      setLoading(false);
    }

    cargarPartidos();
  }, []);

  const partidosPorFecha = useMemo(() => {
    const agrupados: Record<string, Match[]> = {};

    matches.forEach((match) => {
      const fecha = match.match_date || "Sin fecha";

      if (!agrupados[fecha]) {
        agrupados[fecha] = [];
      }

      agrupados[fecha].push(match);
    });

    return Object.entries(agrupados);
  }, [matches]);

  function partidoConResultado(match: Match) {
    return match.home_score !== null && match.away_score !== null;
  }

  function votosDelPartido(match: Match) {
    return votes.filter((vote) => vote.match_id === match.id);
  }

  function votoEmitido(match: Match) {
    return votosDelPartido(match).length > 0;
  }

  function votoCompleto(match: Match) {
    const votos = votosDelPartido(match);
    const votoLocal = votos.some((vote) => vote.team_id === match.home_team?.id);
    const votoVisitante = votos.some(
      (vote) => vote.team_id === match.away_team?.id
    );

    return votoLocal && votoVisitante;
  }

  function renderEstadoMvp(match: Match) {
    if (votoCompleto(match)) {
      return (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-800">
          ✅ Voto emitido
        </div>
      );
    }

    if (votoEmitido(match)) {
      return (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-800">
          ✅ Voto iniciado
        </div>
      );
    }

    if (match.mvp_open) {
      return (
        <Link
          href={`/votar-mvp?match=${match.id}`}
          className="mt-3 block rounded-xl bg-red-600 px-3 py-2 text-center text-sm font-black text-white shadow"
        >
          Votar MVP
        </Link>
      );
    }

    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>
          <h1 className="mt-2 text-center text-3xl font-black">Partidos</h1>
          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Calendario y resultados
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando partidos...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-2xl bg-red-100 p-5 font-bold text-red-700 shadow">
            {errorCarga}
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Todavía no hay partidos creados.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {partidosPorFecha.map(([fecha, partidos]) => (
              <div key={fecha} className="space-y-3">
                <div className="rounded-2xl bg-red-600 px-4 py-3 text-white shadow">
                  <p className="text-sm font-black uppercase tracking-widest">
                    {fecha === "Sin fecha" ? fecha : formatearFecha(fecha)}
                  </p>
                </div>

                {partidos.map((match) => (
                  <div
                    key={match.id}
                    className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl"
                  >
                    <div className="flex items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-white">
                      <p className="text-sm font-black">
                        {match.group_name || "Sin grupo"}
                      </p>

                      <p className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                        {estadoBonito(match.status)}
                      </p>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-lg font-black leading-tight">
                            {match.home_team?.name}
                          </p>

                          <p className="my-1 text-xs font-black uppercase text-slate-400">
                            vs
                          </p>

                          <p className="break-words text-lg font-black leading-tight">
                            {match.away_team?.name}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-2xl bg-slate-950 px-4 py-3 text-center text-white shadow">
                          {partidoConResultado(match) ? (
                            <p className="text-3xl font-black">
                              {match.home_score} - {match.away_score}
                            </p>
                          ) : (
                            <p className="text-2xl font-black text-red-400">
                              {match.match_time}
                            </p>
                          )}

                          <p className="mt-1 text-xs font-bold text-slate-300">
                            {match.field}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 text-sm font-bold text-slate-500">
                        {match.match_time} · {match.field}
                      </div>

                      {renderEstadoMvp(match)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}