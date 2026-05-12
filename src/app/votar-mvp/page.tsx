"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type MatchType = "grupo" | "final";

type Team = {
  id: string;
  name: string;
};

type TeamRef = {
  id: string;
  name: string;
};

type Match = {
  id: string;
  tipo: MatchType;
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
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type RawMatch = Omit<Match, "tipo" | "home_team" | "away_team"> & {
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
  mvp_open: boolean | null;
  sort_order: number;
  home_source_type: string | null;
  home_source_match_title: string | null;
  away_source_type: string | null;
  away_source_match_title: string | null;
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

type MvpNominee = {
  id: string;
  match_id: string | null;
  final_match_id: string | null;
  player_id: string;
  team_id: string | null;
};

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

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

function buscarEquipoPorNombre(
  equipos: Team[],
  nombre: string | null | undefined,
): TeamRef | null {
  const equipo = equipos.find(
    (team) => normalizarTexto(team.name) === normalizarTexto(nombre),
  );

  return equipo ? { id: equipo.id, name: equipo.name } : null;
}

function tipoReferenciaEliminatoria(
  sourceType: string | null | undefined,
  referencia: string | null | undefined,
): "winner" | "loser" | null {
  const tipo = normalizarTexto(sourceType);
  const ref = normalizarTexto(referencia);

  if (tipo === "winner" || tipo === "ganador") return "winner";
  if (tipo === "loser" || tipo === "perdedor") return "loser";

  if (ref.startsWith("ganador ")) return "winner";
  if (ref.startsWith("perdedor ")) return "loser";

  return null;
}

function tituloReferenciaEliminatoria(
  sourceMatchTitle: string | null | undefined,
  referencia: string | null | undefined,
) {
  if (sourceMatchTitle && sourceMatchTitle.trim() !== "") {
    return sourceMatchTitle.trim();
  }

  const ref = (referencia ?? "").trim();

  const ganador = ref.match(/^ganador\s+(.+)$/i);
  if (ganador?.[1]) return ganador[1].trim();

  const perdedor = ref.match(/^perdedor\s+(.+)$/i);
  if (perdedor?.[1]) return perdedor[1].trim();

  return "";
}

function resolverEquipoDesdeReferencia(
  referencia: string | null | undefined,
  sourceType: string | null | undefined,
  sourceMatchTitle: string | null | undefined,
  equipos: Team[],
  eliminatorias: FinalMatch[],
  visitados = new Set<string>(),
): TeamRef | null {
  const directo = buscarEquipoPorNombre(equipos, referencia);

  if (directo) return directo;

  const tipo = tipoReferenciaEliminatoria(sourceType, referencia);
  const tituloOrigen = tituloReferenciaEliminatoria(
    sourceMatchTitle,
    referencia,
  );

  if (!tipo || !tituloOrigen) return null;

  const origen = eliminatorias.find(
    (match) => normalizarTexto(match.title) === normalizarTexto(tituloOrigen),
  );

  if (!origen) return null;
  if (visitados.has(origen.id)) return null;

  visitados.add(origen.id);

  if (origen.home_score === null || origen.away_score === null) {
    return null;
  }

  let ganaLocal: boolean | null = null;

  if (origen.home_score > origen.away_score) {
    ganaLocal = true;
  } else if (origen.home_score < origen.away_score) {
    ganaLocal = false;
  } else if (
    origen.home_penalties !== null &&
    origen.away_penalties !== null &&
    origen.home_penalties !== origen.away_penalties
  ) {
    ganaLocal = origen.home_penalties > origen.away_penalties;
  }

  if (ganaLocal === null) return null;

  const usarLocal = tipo === "winner" ? ganaLocal : !ganaLocal;

  const siguienteReferencia = usarLocal ? origen.home_ref : origen.away_ref;
  const siguienteSourceType = usarLocal
    ? origen.home_source_type
    : origen.away_source_type;
  const siguienteSourceMatchTitle = usarLocal
    ? origen.home_source_match_title
    : origen.away_source_match_title;

  return resolverEquipoDesdeReferencia(
    siguienteReferencia,
    siguienteSourceType,
    siguienteSourceMatchTitle,
    equipos,
    eliminatorias,
    visitados,
  );
}

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

function columnaPartido(tipo: MatchType) {
  return tipo === "final" ? "final_match_id" : "match_id";
}

function ordenarJugadores(jugadores: Player[], homeTeamId: string) {
  return [...jugadores].sort((a, b) => {
    const ordenA = a.team_id === homeTeamId ? 0 : 1;
    const ordenB = b.team_id === homeTeamId ? 0 : 1;

    if (ordenA !== ordenB) return ordenA - ordenB;

    const dorsalA = a.number ?? 9999;
    const dorsalB = b.number ?? 9999;

    if (dorsalA !== dorsalB) return dorsalA - dorsalB;

    return a.name.localeCompare(b.name);
  });
}

export default function VotarMvpPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [nominees, setNominees] = useState<MvpNominee[]>([]);
  const [userId, setUserId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const selectedMatch = matches.find((match) => match.id === selectedMatchId);

  const matchesGrupo = matches.filter(
    (match) => match.group_name === selectedGroup,
  );

  const jugadoresLocal = selectedMatch
    ? players.filter((player) => player.team_id === selectedMatch.home_team_id)
    : [];

  const jugadoresVisitante = selectedMatch
    ? players.filter((player) => player.team_id === selectedMatch.away_team_id)
    : [];

  const votosValidosPartido = useMemo(() => {
    const candidatosValidos = new Set(players.map((player) => player.id));

    return votes.filter((vote) => candidatosValidos.has(vote.player_id));
  }, [votes, players]);

  const totalVotosPartido = votosValidosPartido.length;

  const yaVotoPartido = votes.some((vote) => vote.user_id === userId);

  useEffect(() => {
    const currentUserId = getUserId();
    setUserId(currentUserId);
    cargarDatos(currentUserId);
  }, []);

  const gruposConPartidos = useMemo(() => {
    const nombres = Array.from(
      new Set(matches.map((match) => match.group_name)),
    );

    return nombres.map((name, index) => ({
      id: name || String(index),
      name,
      sort_order: index + 1,
    }));
  }, [matches]);

  async function cargarDatos(currentUserId: string) {
    setLoading(true);
    setErrorCarga("");

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .order("name", { ascending: true });

    if (teamsError) {
      console.error("Error cargando equipos:", teamsError);
      setErrorCarga("No se han podido cargar los equipos.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];

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
        home_team:teams!matches_home_team_id_fkey(id, name),
        away_team:teams!matches_away_team_id_fkey(id, name)
      `,
      )
      .eq("mvp_open", true)
      .order("group_name", { ascending: true })
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      console.error("Error cargando partidos:", matchesError);
      setErrorCarga("No se han podido cargar las votaciones.");
      setLoading(false);
      return;
    }

    const partidosGrupo: Match[] = (
      (matchesData as unknown as RawMatch[]) || []
    ).map((match) => {
      const local = normalizarEquipo(match.home_team);
      const visitante = normalizarEquipo(match.away_team);

      return {
        ...match,
        tipo: "grupo" as const,
        group_name: match.group_name || "Clasificación",
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        home_team: local ? { name: local.name } : null,
        away_team: visitante ? { name: visitante.name } : null,
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
        mvp_open,
        sort_order,
        home_source_type,
        home_source_match_title,
        away_source_type,
        away_source_match_title
      `,
      )
      .eq("mvp_open", true)
      .order("sort_order", { ascending: true });

    if (finalError) {
      console.error("Error cargando eliminatorias:", finalError);
      setErrorCarga("No se han podido cargar las eliminatorias MVP.");
      setLoading(false);
      return;
    }

    const finalesBase = (finalData ?? []) as FinalMatch[];

    const eliminatorias = finalesBase
      .map((match): Match | null => {
        const local = resolverEquipoDesdeReferencia(
          match.home_ref,
          match.home_source_type,
          match.home_source_match_title,
          equipos,
          finalesBase,
        );

        const visitante = resolverEquipoDesdeReferencia(
          match.away_ref,
          match.away_source_type,
          match.away_source_match_title,
          equipos,
          finalesBase,
        );

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
      .filter((match): match is Match => match !== null);

    const todosPartidos = [...partidosGrupo, ...eliminatorias];

    setMatches(todosPartidos);

    if (todosPartidos.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const matchParam = params.get("match");
      const typeParam = params.get("type") as MatchType | null;

      const partidoUrl = matchParam
        ? todosPartidos.find((match) => {
            if (typeParam === "grupo" || typeParam === "final") {
              return match.id === matchParam && match.tipo === typeParam;
            }

            return match.id === matchParam;
          })
        : null;

      const partidoInicial = partidoUrl ?? todosPartidos[0];

      setSelectedGroup(partidoInicial.group_name);
      setSelectedMatchId(partidoInicial.id);
      await cargarCandidatosYVotos(partidoInicial);
    } else {
      setSelectedGroup("");
      setSelectedMatchId("");
      setPlayers([]);
      setVotes([]);
      setNominees([]);
    }

    setLoading(false);
  }

  async function cargarCandidatosYVotos(match: Match) {
    setMensaje("");
    setPlayers([]);
    setVotes([]);
    setNominees([]);

    const columna = columnaPartido(match.tipo);

    const { data: nomineesData, error: nomineesError } = await supabase
      .from("mvp_nominees")
      .select("id, match_id, final_match_id, player_id, team_id")
      .eq(columna, match.id);

    const { data: votesData, error: votesError } = await supabase
      .from("mvp_votes")
      .select("id, match_id, final_match_id, player_id, user_id, team_id")
      .eq(columna, match.id);

    if (nomineesError || votesError) {
      console.error(
        "Error cargando candidatos o votos:",
        nomineesError || votesError,
      );
      setMensaje("No se han podido cargar los candidatos MVP o los votos.");
      return;
    }

    const candidatos = (nomineesData ?? []) as MvpNominee[];
    const votosPartido = (votesData ?? []) as Vote[];

    setNominees(candidatos);
    setVotes(votosPartido);

    const playerIds = Array.from(
      new Set(candidatos.map((row) => row.player_id)),
    );

    if (playerIds.length === 0) {
      setPlayers([]);
      return;
    }

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, team_id, name, number")
      .in("id", playerIds)
      .order("number", { ascending: true })
      .order("name", { ascending: true });

    if (playersError) {
      console.error("Error cargando candidatos MVP:", playersError);
      setMensaje("No se han podido cargar los candidatos MVP de este partido.");
      return;
    }

    const jugadores = ordenarJugadores(
      (playersData ?? []) as Player[],
      match.home_team_id,
    );

    setPlayers(jugadores);
  }

  async function cambiarGrupo(grupo: string) {
    setSelectedGroup(grupo);

    const primerPartidoGrupo = matches.find(
      (match) => match.group_name === grupo,
    );

    if (primerPartidoGrupo) {
      setSelectedMatchId(primerPartidoGrupo.id);
      await cargarCandidatosYVotos(primerPartidoGrupo);
    } else {
      setSelectedMatchId("");
      setPlayers([]);
      setVotes([]);
      setNominees([]);
    }
  }

  async function cambiarPartido(id: string) {
    setSelectedMatchId(id);

    const match = matches.find((item) => item.id === id);

    if (match) {
      await cargarCandidatosYVotos(match);
    }
  }

  function contarVotos(playerId: string) {
    return votosValidosPartido.filter((vote) => vote.player_id === playerId)
      .length;
  }

  async function votar(player: Player) {
    if (!selectedMatch) return;

    if (yaVotoPartido) {
      setMensaje("Ya has votado el MVP de este partido.");
      return;
    }

    const jugadorPuedeSerVotado = players.some((item) => item.id === player.id);

    if (!jugadorPuedeSerVotado) {
      setMensaje("Este jugador no está entre los candidatos MVP del partido.");
      return;
    }

    const candidatoExiste = nominees.some(
      (nominee) => nominee.player_id === player.id,
    );

    if (!candidatoExiste) {
      setMensaje("Este jugador ya no está disponible como candidato MVP.");
      return;
    }

    const payload =
      selectedMatch.tipo === "final"
        ? {
            match_id: null,
            final_match_id: selectedMatch.id,
            player_id: player.id,
            user_id: userId,
            team_id: player.team_id,
          }
        : {
            match_id: selectedMatch.id,
            final_match_id: null,
            player_id: player.id,
            user_id: userId,
            team_id: player.team_id,
          };

    const { error } = await supabase.from("mvp_votes").insert(payload);

    if (error) {
      console.error("Error registrando voto:", error);

      if (error.code === "23505") {
        setMensaje("Ya has votado el MVP de este partido.");
      } else {
        setMensaje("Error al registrar el voto.");
      }

      return;
    }

    setMensaje("Voto registrado correctamente.");
    await cargarCandidatosYVotos(selectedMatch);
  }

  function renderEquipo(nombreEquipo: string, jugadores: Player[]) {
    return (
      <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
        <div className="bg-red-600 px-5 py-3 text-white">
          <p className="break-words text-sm font-black uppercase tracking-widest">
            {nombreEquipo}
          </p>
        </div>

        <div className="space-y-3 p-4">
          {jugadores.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
              No hay candidatos MVP seleccionados para este equipo.
            </p>
          ) : (
            jugadores.map((player) => {
              const votosJugador = contarVotos(player.id);
              const porcentaje =
                totalVotosPartido === 0
                  ? 0
                  : Math.round((votosJugador / totalVotosPartido) * 100);

              return (
                <div
                  key={player.id}
                  className="rounded-2xl bg-slate-50 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-red-600">
                        {player.number ?? "-"}
                      </div>

                      <div className="min-w-0">
                        <p className="break-words font-black leading-tight">
                          {player.name}
                        </p>

                        <p className="text-xs font-bold text-slate-500">
                          {votosJugador} votos · {porcentaje}%
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => votar(player)}
                      disabled={yaVotoPartido}
                      className={`shrink-0 rounded-xl px-4 py-2 text-sm font-black ${
                        yaVotoPartido
                          ? "bg-slate-300 text-slate-500"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {yaVotoPartido ? "Votado" : "Votar"}
                    </button>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
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

          <h1 className="mt-2 text-center text-3xl font-black">Votar MVP</h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Un voto por partido
          </p>
        </div>

        <Link
          href="/inicio"
          className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
        >
          Volver al inicio
        </Link>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando votaciones...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-2xl bg-red-100 p-5 font-bold text-red-700 shadow">
            {errorCarga}
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            No hay votaciones MVP abiertas.
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
              {yaVotoPartido && (
                <div className="mb-4 rounded-xl bg-emerald-100 p-3 text-sm font-black text-emerald-800">
                  ✅ Voto emitido en este partido.
                </div>
              )}

              <label className="text-sm font-black uppercase text-slate-500">
                Fase
              </label>

              <select
                value={selectedGroup}
                onChange={(event) => cambiarGrupo(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
              >
                {gruposConPartidos.map((grupo) => (
                  <option key={grupo.id} value={grupo.name}>
                    {grupo.name}
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
                {matchesGrupo.map((match) => (
                  <option key={`${match.tipo}-${match.id}`} value={match.id}>
                    {match.tipo === "final" ? `${match.phase} · ` : ""}
                    {match.home_team?.name} vs {match.away_team?.name} ·{" "}
                    {formatearFechaSegura(match.match_date)}
                  </option>
                ))}
              </select>

              {selectedMatch && (
                <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm font-black text-red-600">
                    {selectedMatch.tipo === "final"
                      ? `${selectedMatch.phase} · ${selectedMatch.title}`
                      : selectedMatch.group_name}
                  </p>

                  <h2 className="mt-1 break-words text-xl font-black leading-tight">
                    {selectedMatch.home_team?.name} vs{" "}
                    {selectedMatch.away_team?.name}
                  </h2>

                  <p className="mt-2 text-sm font-bold text-slate-500">
                    {formatearFechaSegura(selectedMatch.match_date)} ·{" "}
                    {selectedMatch.match_time ?? "Hora pendiente"} ·{" "}
                    {selectedMatch.field ?? "Campo pendiente"}
                  </p>

                  <p className="mt-3 text-2xl font-black">
                    {selectedMatch.home_score ?? "-"} -{" "}
                    {selectedMatch.away_score ?? "-"}
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-500">
                    Candidatos MVP: {players.length} · Votos emitidos:{" "}
                    {totalVotosPartido}
                  </p>
                </div>
              )}

              {players.length === 0 && selectedMatch && (
                <div className="mt-4 rounded-xl bg-yellow-100 p-3 text-sm font-bold text-yellow-900">
                  Todavía no hay candidatos MVP seleccionados para este partido.
                </div>
              )}

              {mensaje && (
                <div
                  className={`mt-4 rounded-xl p-3 text-sm font-bold ${
                    mensaje.includes("correctamente")
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {mensaje}
                </div>
              )}
            </div>

            {selectedMatch && (
              <div className="mt-6 space-y-5">
                {renderEquipo(
                  selectedMatch.home_team?.name ?? "Equipo local",
                  jugadoresLocal,
                )}

                {renderEquipo(
                  selectedMatch.away_team?.name ?? "Equipo visitante",
                  jugadoresVisitante,
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}