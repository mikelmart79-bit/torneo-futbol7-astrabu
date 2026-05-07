"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

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
  status: string | null;
  sort_order: number;
  mvp_open: boolean | null;
};

type AdminMvpMatch = {
  id: string;
  tipo: "grupo" | "final";
  phaseLabel: string;
  title: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_name: string;
  away_name: string;
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
};

const ORDEN_FASES = [
  "Clasificación",
  "Octavos",
  "Cuartos",
  "Semifinales",
  "Tercer puesto",
  "Final",
];

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
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

function ordenarFases(fases: string[]) {
  return [...fases].sort((a, b) => {
    const indexA = ORDEN_FASES.indexOf(a);
    const indexB = ORDEN_FASES.indexOf(b);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return a.localeCompare(b);
  });
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

export default function AdminMvpPage() {
  const [matches, setMatches] = useState<AdminMvpMatch[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);

  const [faseActiva, setFaseActiva] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const fasesDisponibles = useMemo(() => {
    const fases = Array.from(new Set(matches.map((match) => match.phaseLabel)));
    return ordenarFases(fases);
  }, [matches]);

  const matchesFase = useMemo(() => {
    return matches.filter((match) => match.phaseLabel === faseActiva);
  }, [matches, faseActiva]);

  const selectedMatch = useMemo(() => {
    return matches.find((match) => match.id === selectedMatchId) ?? null;
  }, [matches, selectedMatchId]);

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

  const ranking = useMemo(() => {
    const teamMap = new Map(teams.map((team) => [team.id, team.name]));
    const playerMap = new Map(players.map((player) => [player.id, player]));

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
  }, [votosPartido, players, teams, totalVotos]);

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
        "id, phase, title, home_ref, away_ref, match_date, match_time, field, home_score, away_score, status, sort_order, mvp_open"
      )
      .order("sort_order", { ascending: true });

    if (finalError) {
      console.error("Error cargando eliminatorias:", finalError);
      setMensaje("No se han podido cargar las eliminatorias.");
      setLoading(false);
      return;
    }

    const partidosFinales: AdminMvpMatch[] = ((finalData ?? []) as FinalMatch[]).map(
      (match) => ({
        id: match.id,
        tipo: "final",
        phaseLabel: normalizarFase(match.phase),
        title: match.title,
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_name: match.home_ref || "Local",
        away_name: match.away_ref || "Visitante",
        home_score: match.home_score,
        away_score: match.away_score,
        status: match.status,
        mvp_open: match.mvp_open,
        sort_order: match.sort_order,
      })
    );

    const todos = ordenarPartidos([...partidosGrupo, ...partidosFinales]);
    setMatches(todos);

    const partidoMantener = matchMantenerId
      ? todos.find((match) => match.id === matchMantenerId)
      : null;

    const partidoInicial = partidoMantener ?? todos[0] ?? null;

    if (partidoInicial) {
      setFaseActiva(partidoInicial.phaseLabel);
      setSelectedMatchId(partidoInicial.id);
    } else {
      setFaseActiva("");
      setSelectedMatchId("");
    }

    setLoading(false);
  }

  async function cambiarFase(fase: string) {
    setFaseActiva(fase);

    const primerPartido = matches.find((match) => match.phaseLabel === fase);

    if (primerPartido) {
      setSelectedMatchId(primerPartido.id);
    } else {
      setSelectedMatchId("");
    }

    setMensaje("");
  }

  async function cambiarPartido(id: string) {
    setSelectedMatchId(id);
    setMensaje("");
  }

  async function cambiarEstadoVotacion() {
    if (!selectedMatch) {
      setMensaje("Selecciona un partido.");
      return;
    }

    setSaving(true);
    setMensaje("");

    const tabla = selectedMatch.tipo === "final" ? "final_matches" : "matches";

    const { error } = await supabase
      .from(tabla)
      .update({ mvp_open: !selectedMatch.mvp_open })
      .eq("id", selectedMatch.id);

    if (error) {
      console.error("Error cambiando votación:", error);
      setMensaje("No se ha podido cambiar el estado de la votación.");
      setSaving(false);
      return;
    }

    setMensaje(
      selectedMatch.mvp_open
        ? "Votación MVP cerrada correctamente."
        : "Votación MVP abierta correctamente."
    );

    await cargarDatos(selectedMatch.id);
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
              Clasificación y eliminatorias
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
              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <label className="text-sm font-black uppercase text-slate-500">
                  Fase
                </label>

                <select
                  value={faseActiva}
                  onChange={(event) => cambiarFase(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  {fasesDisponibles.map((fase) => (
                    <option key={fase} value={fase}>
                      {fase}
                    </option>
                  ))}
                </select>

                <label className="mt-4 block text-sm font-black uppercase text-slate-500">
                  Partido
                </label>

                <select
                  value={selectedMatchId}
                  onChange={(event) => cambiarPartido(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  {matchesFase.map((match) => (
                    <option key={`${match.tipo}-${match.id}`} value={match.id}>
                      {match.title} · {match.home_name} vs {match.away_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMatch && (
                <>
                  <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
                    <div
                      className={`px-5 py-4 text-white ${
                        selectedMatch.mvp_open ? "bg-emerald-600" : "bg-red-600"
                      }`}
                    >
                      <p className="text-sm font-black uppercase tracking-widest opacity-90">
                        {selectedMatch.phaseLabel}
                      </p>

                      <h2 className="mt-2 text-2xl font-black leading-tight">
                        {selectedMatch.home_name} vs {selectedMatch.away_name}
                      </h2>

                      <p className="mt-2 text-sm font-bold opacity-90">
                        {selectedMatch.title}
                      </p>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-100 p-4 text-center">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Marcador
                          </p>

                          <p className="mt-1 text-2xl font-black text-slate-950">
                            {renderMarcador(selectedMatch)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-100 p-4 text-center">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Estado
                          </p>

                          <p className="mt-1 text-sm font-black text-slate-950">
                            {estadoBonito(selectedMatch.status)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-100 p-4">
                        <p className="text-sm font-black text-slate-900">
                          {formatearFechaSegura(selectedMatch.match_date)} ·{" "}
                          {selectedMatch.match_time ?? "Hora pendiente"} ·{" "}
                          {selectedMatch.field ?? "Campo pendiente"}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
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

                      <button
                        onClick={cambiarEstadoVotacion}
                        disabled={saving}
                        className={`mt-4 w-full rounded-xl py-3 font-black text-white shadow disabled:opacity-60 ${
                          selectedMatch.mvp_open
                            ? "bg-slate-950"
                            : "bg-red-600"
                        }`}
                      >
                        {saving
                          ? "Guardando..."
                          : selectedMatch.mvp_open
                          ? "Cerrar votación MVP"
                          : "Abrir votación MVP"}
                      </button>

                      <Link
                        href={`/votar-mvp?match=${selectedMatch.id}&type=${selectedMatch.tipo}`}
                        className="mt-3 block rounded-xl bg-white py-3 text-center font-black text-slate-950 shadow ring-1 ring-slate-200"
                      >
                        Ver pantalla de votación
                      </Link>

                      {totalVotos > 0 && (
                        <button
                          onClick={borrarVotosPartido}
                          disabled={saving}
                          className="mt-3 w-full rounded-xl bg-red-100 py-3 font-black text-red-700 shadow disabled:opacity-60"
                        >
                          Borrar votos de este partido
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                    <p className="text-sm font-black uppercase tracking-widest text-red-600">
                      Ranking MVP del partido
                    </p>

                    {ranking.length === 0 ? (
                      <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                        Todavía no hay votos para este partido.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {ranking.map((row, index) => (
                          <div
                            key={row.player_id}
                            className="rounded-2xl bg-slate-100 p-4 shadow-sm"
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
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}