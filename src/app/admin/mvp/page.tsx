"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Group = {
  id: string;
  name: string;
  sort_order: number;
};

type Team = {
  id: string;
  name: string;
};

type MvpMatch = {
  id: string;
  tipo: "grupo" | "final";
  group_name: string;
  phase?: string;
  title?: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  mvp_open: boolean | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type RawGroupMatch = Omit<MvpMatch, "tipo" | "home_team" | "away_team"> & {
  home_team: { name: string }[] | { name: string } | null;
  away_team: { name: string }[] | { name: string } | null;
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

function normalizarEquipo(
  equipo: RawGroupMatch["home_team"]
): { name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function buscarEquipoPorNombre(nombre: string, equipos: Team[]) {
  const limpio = nombre.trim().toLowerCase();

  return equipos.find((team) => team.name.trim().toLowerCase() === limpio);
}

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

export default function AdminMvpPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MvpMatch[]>([]);

  const [grupoActivo, setGrupoActivo] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");

  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const gruposConPartidos = useMemo(() => {
    const nombresPartidos = Array.from(
      new Set(matches.map((match) => match.group_name).filter(Boolean))
    );

    const nombresOrdenados = groups
      .map((group) => group.name)
      .filter((name) => nombresPartidos.includes(name));

    const extras = nombresPartidos.filter(
      (name) => !nombresOrdenados.includes(name)
    );

    return [...nombresOrdenados, ...extras];
  }, [groups, matches]);

  const matchesGrupo = matches.filter(
    (match) => match.group_name === grupoActivo
  );

  const selectedMatch =
    matches.find((match) => match.id === selectedMatchId) ?? null;

  const totalVotos = votes.length;
  const totalVotantes = new Set(votes.map((vote) => vote.user_id)).size;

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos(matchMantenerId?: string, grupoMantener?: string) {
    setLoading(true);

    const { data: groupsData, error: groupsError } = await supabase
      .from("groups")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true });

    if (groupsError) {
      setMensaje("Error cargando grupos.");
      setLoading(false);
      return;
    }

    const grupos = (groupsData ?? []) as Group[];
    setGroups(grupos);

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .order("name", { ascending: true });

    if (teamsError) {
      setMensaje("Error cargando equipos.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

    const { data: groupMatchesData, error: matchesError } = await supabase
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
        status,
        mvp_open,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .order("group_name", { ascending: true })
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      setMensaje("Error cargando partidos de grupos.");
      setLoading(false);
      return;
    }

    const partidosGrupo: MvpMatch[] = (
      (groupMatchesData as unknown as RawGroupMatch[]) || []
    ).map((match) => ({
      ...match,
      tipo: "grupo" as const,
      group_name: match.group_name || "Fase de grupos",
      home_team: normalizarEquipo(match.home_team),
      away_team: normalizarEquipo(match.away_team),
    }));

    const { data: finalData, error: finalError } = await supabase
      .from("final_matches")
      .select(
        "id, phase, title, home_ref, away_ref, match_date, match_time, field, home_score, away_score, status, sort_order, mvp_open"
      )
      .order("sort_order", { ascending: true });

    if (finalError) {
      setMensaje("Error cargando eliminatorias.");
      setLoading(false);
      return;
    }

    const eliminatorias: MvpMatch[] = ((finalData ?? []) as FinalMatch[]).map(
      (match) => {
        const local = buscarEquipoPorNombre(match.home_ref, equipos);
        const visitante = buscarEquipoPorNombre(match.away_ref, equipos);

        return {
          id: match.id,
          tipo: "final" as const,
          group_name: "Eliminatorias",
          phase: match.phase,
          title: match.title,
          match_date: match.match_date,
          match_time: match.match_time,
          field: match.field,
          home_team_id: local?.id ?? "",
          away_team_id: visitante?.id ?? "",
          home_score: match.home_score,
          away_score: match.away_score,
          status: match.status,
          mvp_open: match.mvp_open,
          home_team: { name: match.home_ref },
          away_team: { name: match.away_ref },
        };
      }
    );

    const todosPartidos = [...partidosGrupo, ...eliminatorias];
    setMatches(todosPartidos);

    const partidoMantener = matchMantenerId
      ? todosPartidos.find((match) => match.id === matchMantenerId)
      : null;

    const grupoInicial =
      grupoMantener ||
      partidoMantener?.group_name ||
      grupos[0]?.name ||
      todosPartidos[0]?.group_name ||
      "";

    setGrupoActivo(grupoInicial);

    const partidoInicial =
      partidoMantener ??
      todosPartidos.find((match) => match.group_name === grupoInicial) ??
      todosPartidos[0] ??
      null;

    if (partidoInicial) {
      setSelectedMatchId(partidoInicial.id);
      await cargarDatosPartido(partidoInicial);
    } else {
      setSelectedMatchId("");
      setPlayers([]);
      setVotes([]);
    }

    setLoading(false);
  }

  async function cargarDatosPartido(match: MvpMatch) {
    const idsEquipos = [match.home_team_id, match.away_team_id].filter(Boolean);

    const { data: playersData, error: playersError } =
      idsEquipos.length > 0
        ? await supabase
            .from("players")
            .select("id, team_id, name, number")
            .in("team_id", idsEquipos)
            .order("number", { ascending: true })
            .order("name", { ascending: true })
        : { data: [], error: null };

    const { data: votesData, error: votesError } = await supabase
      .from("mvp_votes")
      .select("id, match_id, player_id, user_id, team_id")
      .eq("match_id", match.id);

    if (playersError || votesError) {
      setMensaje("Error cargando jugadores o votos.");
      return;
    }

    setPlayers((playersData ?? []) as Player[]);
    setVotes((votesData ?? []) as Vote[]);
    setMensaje("");
  }

  async function cambiarGrupo(grupo: string) {
    setGrupoActivo(grupo);

    const primerPartidoGrupo = matches.find(
      (match) => match.group_name === grupo
    );

    if (primerPartidoGrupo) {
      setSelectedMatchId(primerPartidoGrupo.id);
      await cargarDatosPartido(primerPartidoGrupo);
    } else {
      setSelectedMatchId("");
      setPlayers([]);
      setVotes([]);
    }
  }

  async function cambiarPartido(id: string) {
    setSelectedMatchId(id);

    const match = matches.find((item) => item.id === id);

    if (match) {
      await cargarDatosPartido(match);
    }
  }

  async function cambiarEstadoMvp(abierto: boolean) {
    if (!selectedMatch) return;

    const tabla = selectedMatch.tipo === "grupo" ? "matches" : "final_matches";

    const { error } = await supabase
      .from(tabla)
      .update({ mvp_open: abierto })
      .eq("id", selectedMatch.id);

    if (error) {
      setMensaje("No se ha podido cambiar el estado de la votación.");
      return;
    }

    setMensaje(abierto ? "Votación MVP abierta." : "Votación MVP cerrada.");
    await cargarDatos(selectedMatch.id, selectedMatch.group_name);
  }

  async function borrarVotos() {
    if (!selectedMatch) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres borrar todos los votos MVP de este partido?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("mvp_votes")
      .delete()
      .eq("match_id", selectedMatch.id);

    if (error) {
      setMensaje(`No se han podido borrar los votos: ${error.message}`);
      return;
    }

    setMensaje("Votos borrados correctamente.");
    await cargarDatosPartido(selectedMatch);
  }

  function votosJugador(playerId: string) {
    return votes.filter((vote) => vote.player_id === playerId).length;
  }

  function totalVotosEquipo(teamId: string) {
    const ids = players
      .filter((player) => player.team_id === teamId)
      .map((player) => player.id);

    return votes.filter(
      (vote) => vote.team_id === teamId || ids.includes(vote.player_id)
    ).length;
  }

  function renderResultadosEquipo(nombre: string, teamId: string) {
    const jugadores = players.filter((player) => player.team_id === teamId);
    const total = totalVotosEquipo(teamId);

    const ordenados = [...jugadores].sort((a, b) => {
      const votosB = votosJugador(b.id);
      const votosA = votosJugador(a.id);

      if (votosB !== votosA) return votosB - votosA;

      return (a.number ?? 999) - (b.number ?? 999);
    });

    return (
      <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
        <div className="bg-red-600 px-5 py-3 text-white">
          <p className="break-words text-sm font-black uppercase tracking-widest">
            {nombre}
          </p>
          <p className="mt-1 text-xs font-bold text-red-100">
            {total} voto{total === 1 ? "" : "s"} para este equipo
          </p>
        </div>

        <div className="space-y-3 p-4">
          {ordenados.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
              No hay jugadores cargados o no se ha podido vincular el equipo.
            </p>
          ) : (
            ordenados.map((player, index) => {
              const votos = votosJugador(player.id);
              const porcentaje =
                total === 0 ? 0 : Math.round((votos / total) * 100);
              const lider = index === 0 && votos > 0;

              return (
                <div
                  key={player.id}
                  className={`rounded-2xl p-4 shadow-sm ${
                    lider
                      ? "bg-emerald-50 ring-1 ring-emerald-200"
                      : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                          lider
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-100 text-red-600"
                        }`}
                      >
                        {player.number ?? "-"}
                      </div>

                      <div className="min-w-0">
                        <p className="break-words font-black leading-tight">
                          {player.name}
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          {votos} votos · {porcentaje}%
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 text-2xl font-black text-red-600">
                      {votos}
                    </p>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>

                  {lider && (
                    <p className="mt-2 text-xs font-black text-emerald-700">
                      MVP provisional del equipo
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const mensajeCorrecto =
    mensaje.includes("abierta") ||
    mensaje.includes("cerrada") ||
    mensaje.includes("correctamente");

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
              Estado y recuento de votos
            </p>
          </div>

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            {loading ? (
              <p className="font-bold text-slate-500">Cargando votaciones...</p>
            ) : matches.length === 0 ? (
              <p className="font-bold text-slate-500">
                Todavía no hay partidos creados.
              </p>
            ) : (
              <>
                <label className="text-sm font-black uppercase text-slate-500">
                  Fase / grupo
                </label>

                <select
                  value={grupoActivo}
                  onChange={(event) => cambiarGrupo(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  {gruposConPartidos.map((grupo) => (
                    <option key={grupo} value={grupo}>
                      {grupo}
                    </option>
                  ))}
                </select>

                <label className="mt-5 block text-sm font-black uppercase text-slate-500">
                  Partido
                </label>

                <select
                  value={selectedMatchId}
                  onChange={(event) => cambiarPartido(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  {matchesGrupo.length === 0 ? (
                    <option value="">No hay partidos</option>
                  ) : (
                    matchesGrupo.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.tipo === "final" ? `${match.phase} · ` : ""}
                        {match.home_team?.name ?? "Local"} vs{" "}
                        {match.away_team?.name ?? "Visitante"} ·{" "}
                        {formatearFechaSegura(match.match_date)} ·{" "}
                        {match.match_time ?? "Hora pendiente"}
                      </option>
                    ))
                  )}
                </select>

                {selectedMatch ? (
                  <>
                    <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                      <p className="text-sm font-black text-red-600">
                        {selectedMatch.tipo === "final"
                          ? `${selectedMatch.phase} · ${
                              selectedMatch.title ?? "Eliminatoria"
                            }`
                          : selectedMatch.group_name}
                      </p>

                      <h2 className="mt-1 break-words text-xl font-black leading-tight">
                        {selectedMatch.home_team?.name} vs{" "}
                        {selectedMatch.away_team?.name}
                      </h2>

                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {formatearFechaSegura(selectedMatch.match_date)} ·{" "}
                        {selectedMatch.match_time ?? "Hora pendiente"} ·{" "}
                        {selectedMatch.field ?? "Campo pendiente"}
                      </p>

                      <p className="mt-3 text-2xl font-black">
                        {selectedMatch.home_score ?? "-"} -{" "}
                        {selectedMatch.away_score ?? "-"}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Votación
                          </p>
                          <p
                            className={`mt-1 text-lg font-black ${
                              selectedMatch.mvp_open
                                ? "text-emerald-700"
                                : "text-red-600"
                            }`}
                          >
                            {selectedMatch.mvp_open ? "Abierta" : "Cerrada"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                          <p className="text-xs font-black uppercase text-slate-500">
                            Votos
                          </p>
                          <p className="mt-1 text-lg font-black text-red-600">
                            {totalVotos}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-sm font-bold text-slate-500">
                        Votantes registrados: {totalVotantes}
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => cambiarEstadoMvp(true)}
                        className="rounded-xl bg-emerald-600 py-3 font-black text-white shadow"
                      >
                        Abrir
                      </button>

                      <button
                        onClick={() => cambiarEstadoMvp(false)}
                        className="rounded-xl bg-red-600 py-3 font-black text-white shadow"
                      >
                        Cerrar
                      </button>
                    </div>

                    <button
                      onClick={borrarVotos}
                      className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                    >
                      Borrar votos del partido
                    </button>
                  </>
                ) : (
                  <p className="mt-5 rounded-2xl bg-slate-100 p-4 font-bold text-slate-500">
                    No hay partidos cargados en esta fase o grupo.
                  </p>
                )}

                {mensaje && (
                  <div
                    className={`mt-4 rounded-xl p-3 text-sm font-bold ${
                      mensajeCorrecto
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {mensaje}
                  </div>
                )}
              </>
            )}
          </div>

          {selectedMatch && (
            <div className="mt-6 space-y-5">
              {renderResultadosEquipo(
                selectedMatch.home_team?.name ?? "Equipo local",
                selectedMatch.home_team_id
              )}

              {renderResultadosEquipo(
                selectedMatch.away_team?.name ?? "Equipo visitante",
                selectedMatch.away_team_id
              )}
            </div>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}