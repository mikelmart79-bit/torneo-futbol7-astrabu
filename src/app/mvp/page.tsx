"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Team = {
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
  match_id: string;
  player_id: string;
  user_id: string;
  team_id: string | null;
};

type PlayerRow = Player & {
  team_name: string;
  votes: number;
  percentage: number;
};

type TeamRef = {
  id: string;
  name: string;
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
  mvp_open: boolean | null;
};

type OpenMatch = {
  id: string;
  tipo: "grupo" | "final";
  group_name: string | null;
  phase?: string;
  title?: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
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

function buscarEquipoPorNombre(nombre: string, equipos: Team[]) {
  const limpio = nombre.trim().toLowerCase();

  return equipos.find((team) => team.name.trim().toLowerCase() === limpio);
}

export default function MvpPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [openMatches, setOpenMatches] = useState<OpenMatch[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [abiertasAbierto, setAbiertasAbierto] = useState(true);
  const [idealAbierto, setIdealAbierto] = useState(false);
  const [restoAbierto, setRestoAbierto] = useState(false);

  useEffect(() => {
    const currentUserId = getUserId();
    setUserId(currentUserId);

    async function cargarDatos() {
      setLoading(true);
      setErrorCarga("");

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, team_id, name, number")
        .order("number", { ascending: true });

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name")
        .order("name", { ascending: true });

      const { data: votesData, error: votesError } = await supabase
        .from("mvp_votes")
        .select("id, match_id, player_id, user_id, team_id");

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`
          id,
          group_name,
          match_date,
          match_time,
          field,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          mvp_open,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .eq("mvp_open", true)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true });

      const { data: finalData, error: finalError } = await supabase
        .from("final_matches")
        .select(
          "id, phase, title, home_ref, away_ref, match_date, match_time, field, home_score, away_score, mvp_open"
        )
        .eq("mvp_open", true)
        .order("sort_order", { ascending: true });

      if (
        playersError ||
        teamsError ||
        votesError ||
        matchesError ||
        finalError
      ) {
        setErrorCarga("No se han podido cargar los datos MVP.");
        setLoading(false);
        return;
      }

      const equipos = (teamsData ?? []) as Team[];

      const partidosGrupo: OpenMatch[] = (
        (matchesData as unknown as RawGroupMatch[]) || []
      ).map((match) => ({
        id: match.id,
        tipo: "grupo" as const,
        group_name: match.group_name,
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        home_score: match.home_score,
        away_score: match.away_score,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      }));

      const eliminatorias: OpenMatch[] = ((finalData ?? []) as FinalMatch[])
        .map((match): OpenMatch | null => {
          const local = buscarEquipoPorNombre(match.home_ref, equipos);
          const visitante = buscarEquipoPorNombre(match.away_ref, equipos);

          if (!local || !visitante) return null;

          return {
            id: match.id,
            tipo: "final" as const,
            group_name: "Eliminatorias",
            phase: match.phase,
            title: match.title,
            match_date: match.match_date,
            match_time: match.match_time,
            field: match.field,
            home_team_id: local.id,
            away_team_id: visitante.id,
            home_score: match.home_score,
            away_score: match.away_score,
            home_team: { name: local.name },
            away_team: { name: visitante.name },
          };
        })
        .filter((match): match is OpenMatch => match !== null);

      setPlayers((playersData ?? []) as Player[]);
      setTeams(equipos);
      setVotes((votesData ?? []) as Vote[]);
      setOpenMatches([...partidosGrupo, ...eliminatorias]);
      setLoading(false);
    }

    cargarDatos();
  }, []);

  const totalVotes = votes.length;

  const ranking = useMemo(() => {
    const teamMap = new Map(teams.map((team) => [team.id, team.name]));

    const rows: PlayerRow[] = players.map((player) => {
      const playerVotes = votes.filter(
        (vote) => vote.player_id === player.id
      ).length;

      return {
        ...player,
        team_name: teamMap.get(player.team_id) ?? "Equipo",
        votes: playerVotes,
        percentage:
          totalVotes === 0 ? 0 : Math.round((playerVotes / totalVotes) * 100),
      };
    });

    return rows.sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      if ((a.number ?? 999) !== (b.number ?? 999)) {
        return (a.number ?? 999) - (b.number ?? 999);
      }
      return a.name.localeCompare(b.name);
    });
  }, [players, teams, votes, totalVotes]);

  const rankingConVotos = ranking.filter((player) => player.votes > 0);
  const equipoIdeal = rankingConVotos.slice(0, 7);
  const restoJugadores = rankingConVotos.slice(7);

  function votosUsuarioDelPartido(match: OpenMatch) {
    return votes.filter(
      (vote) => vote.match_id === match.id && vote.user_id === userId
    );
  }

  function votoCompleto(match: OpenMatch) {
    const votosUsuario = votosUsuarioDelPartido(match);

    const votoLocal = votosUsuario.some(
      (vote) => vote.team_id === match.home_team_id
    );

    const votoVisitante = votosUsuario.some(
      (vote) => vote.team_id === match.away_team_id
    );

    return votoLocal && votoVisitante;
  }

  function votoIniciado(match: OpenMatch) {
    return votosUsuarioDelPartido(match).length > 0;
  }

  function renderEstadoVoto(match: OpenMatch) {
    if (votoCompleto(match)) {
      return (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-800">
          ✅ Voto emitido
        </div>
      );
    }

    if (votoIniciado(match)) {
      return (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-800">
          ✅ Voto iniciado
        </div>
      );
    }

    return (
      <Link
        href={`/votar-mvp?match=${match.id}`}
        className="mt-3 block rounded-xl bg-red-600 px-3 py-2 text-center text-sm font-black text-white shadow"
      >
        Votar MVP
      </Link>
    );
  }

  function renderPlayer(player: PlayerRow, index: number) {
    return (
      <div key={player.id} className="rounded-2xl bg-slate-50 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
              {index + 1}
            </div>

            <div className="min-w-0">
              <p className="break-words font-black leading-tight">
                {player.name}
              </p>
              <p className="text-xs font-bold text-slate-500">
                #{player.number ?? "-"} · {player.team_name}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-red-600">{player.votes}</p>
            <p className="text-xs font-bold text-slate-500">
              {player.percentage}%
            </p>
          </div>
        </div>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-600"
            style={{ width: `${player.percentage}%` }}
          />
        </div>
      </div>
    );
  }

  function renderPartidoAbierto(match: OpenMatch) {
    return (
      <div key={match.id} className="rounded-2xl bg-slate-50 p-4 shadow-sm">
        <p className="text-xs font-black uppercase text-red-600">
          {match.tipo === "final"
            ? `${match.phase} · ${match.title}`
            : match.group_name}
        </p>

        <div className="mt-2 flex items-center justify-between gap-3">
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
            <p className="text-lg font-black text-red-400">
              {match.match_time ?? "--:--"}
            </p>
            <p className="text-xs font-bold text-slate-300">
              {match.field ?? "Campo"}
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm font-bold text-slate-500">
          {formatearFecha(match.match_date)}
        </p>

        {renderEstadoVoto(match)}
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
          <h1 className="mt-2 text-center text-3xl font-black">MVP</h1>
        </div>

        <Link
          href="/votar-mvp"
          className="mt-6 block w-full rounded-2xl bg-red-600 py-4 text-center text-lg font-black text-white shadow-2xl"
        >
          Votar MVP
        </Link>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando MVP...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-2xl bg-red-100 p-5 font-bold text-red-700 shadow">
            {errorCarga}
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
              <p className="text-sm font-black uppercase text-slate-500">
                Votos totales
              </p>
              <p className="mt-1 text-4xl font-black text-red-600">
                {totalVotes}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
                <button
                  onClick={() => setAbiertasAbierto(!abiertasAbierto)}
                  className="flex w-full items-center justify-between bg-slate-950 px-5 py-4 text-left text-white"
                >
                  <div>
                    <p className="text-lg font-black">Votaciones abiertas</p>
                    <p className="text-sm font-bold opacity-80">
                      Partidos disponibles para votar
                    </p>
                  </div>

                  <span className="text-3xl font-black">
                    {abiertasAbierto ? "−" : "+"}
                  </span>
                </button>

                {abiertasAbierto && (
                  <div className="space-y-3 p-4">
                    {openMatches.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                        No hay votaciones MVP abiertas.
                      </p>
                    ) : (
                      openMatches.map((match) => renderPartidoAbierto(match))
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
                <button
                  onClick={() => setIdealAbierto(!idealAbierto)}
                  className="flex w-full items-center justify-between bg-red-600 px-5 py-4 text-left text-white"
                >
                  <div>
                    <p className="text-lg font-black">Equipo ideal provisional</p>
                    <p className="text-sm font-bold opacity-90">
                      Los 7 jugadores más votados
                    </p>
                  </div>

                  <span className="text-3xl font-black">
                    {idealAbierto ? "−" : "+"}
                  </span>
                </button>

                {idealAbierto && (
                  <div className="space-y-3 p-4">
                    {equipoIdeal.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                        Todavía no hay votos.
                      </p>
                    ) : (
                      equipoIdeal.map((player, index) =>
                        renderPlayer(player, index)
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
                <button
                  onClick={() => setRestoAbierto(!restoAbierto)}
                  className="flex w-full items-center justify-between bg-slate-950 px-5 py-4 text-left text-white"
                >
                  <div>
                    <p className="text-lg font-black">Resto de jugadores</p>
                    <p className="text-sm font-bold opacity-80">
                      Ordenados por votos
                    </p>
                  </div>

                  <span className="text-3xl font-black">
                    {restoAbierto ? "−" : "+"}
                  </span>
                </button>

                {restoAbierto && (
                  <div className="space-y-3 p-4">
                    {restoJugadores.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                        No hay más jugadores con votos.
                      </p>
                    ) : (
                      restoJugadores.map((player, index) =>
                        renderPlayer(player, index + 7)
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}