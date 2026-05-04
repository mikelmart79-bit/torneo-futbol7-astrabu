"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Match = {
  id: string;
  group_name: string;
  match_date: string;
  match_time: string;
  field: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  mvp_open: boolean;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
  home_team: { name: string }[] | { name: string } | null;
  away_team: { name: string }[] | { name: string } | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number;
};

type Vote = {
  id: string;
  match_id: string;
  player_id: string;
  user_id: string;
  team_id: string | null;
};

function normalizarEquipo(
  equipo: RawMatch["home_team"]
): { name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

export default function AdminMvpPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [grupoActivo, setGrupoActivo] = useState("Grupo A");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const grupos = useMemo(() => {
    const encontrados = Array.from(
      new Set(matches.map((match) => match.group_name).filter(Boolean))
    );

    return encontrados.length > 0
      ? encontrados
      : ["Grupo A", "Grupo B", "Grupo C", "Grupo D"];
  }, [matches]);

  const matchesGrupo = matches.filter(
    (match) => match.group_name === grupoActivo
  );

  const selectedMatch = matchesGrupo.find(
    (match) => match.id === selectedMatchId
  );

  const totalVotos = votes.length;

  useEffect(() => {
    cargarPartidos();
  }, []);

  async function cargarPartidos() {
    setLoading(true);

    const { data, error } = await supabase
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

    if (error) {
      setMensaje("Error cargando partidos.");
      setLoading(false);
      return;
    }

    const partidos: Match[] = ((data as unknown as RawMatch[]) || []).map(
      (match) => ({
        ...match,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      })
    );

    setMatches(partidos);

    if (partidos.length > 0) {
      const primerGrupo = partidos[0].group_name || "Grupo A";
      const primerPartido = partidos.find(
        (match) => match.group_name === primerGrupo
      );

      setGrupoActivo(primerGrupo);

      if (primerPartido) {
        setSelectedMatchId(primerPartido.id);
        await cargarDatosPartido(primerPartido);
      }
    }

    setLoading(false);
  }

  async function cargarDatosPartido(match: Match) {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, team_id, name, number")
      .in("team_id", [match.home_team_id, match.away_team_id])
      .order("number", { ascending: true });

    const { data: votesData } = await supabase
      .from("mvp_votes")
      .select("id, match_id, player_id, user_id, team_id")
      .eq("match_id", match.id);

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

    const { error } = await supabase
      .from("matches")
      .update({ mvp_open: abierto })
      .eq("id", selectedMatch.id);

    if (error) {
      setMensaje("No se ha podido cambiar el estado de la votación.");
      return;
    }

    setMensaje(abierto ? "Votación MVP abierta." : "Votación MVP cerrada.");
    await cargarPartidos();
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

    return votes.filter((vote) => ids.includes(vote.player_id)).length;
  }

  function renderResultadosEquipo(nombre: string, teamId: string) {
    const jugadores = players.filter((player) => player.team_id === teamId);
    const total = totalVotosEquipo(teamId);

    const ordenados = [...jugadores].sort(
      (a, b) => votosJugador(b.id) - votosJugador(a.id)
    );

    return (
      <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
        <div className="bg-red-600 px-5 py-3 text-white">
          <p className="text-sm font-black uppercase tracking-widest">
            {nombre}
          </p>
        </div>

        <div className="space-y-3 p-4">
          {ordenados.length === 0 ? (
            <p className="text-sm font-bold text-slate-500">
              No hay jugadores cargados.
            </p>
          ) : (
            ordenados.map((player) => {
              const votos = votosJugador(player.id);
              const porcentaje =
                total === 0 ? 0 : Math.round((votos / total) * 100);

              return (
                <div
                  key={player.id}
                  className="rounded-2xl bg-slate-50 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-red-600">
                        {player.number}
                      </div>

                      <div>
                        <p className="font-black">{player.name}</p>
                        <p className="text-xs font-bold text-slate-500">
                          {votos} votos · {porcentaje}%
                        </p>
                      </div>
                    </div>

                    <p className="text-2xl font-black text-red-600">
                      {votos}
                    </p>
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
          </div>

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            {loading ? (
              <p className="font-bold text-slate-500">Cargando votaciones...</p>
            ) : matches.length === 0 ? (
              <p className="font-bold text-slate-500">
                No hay partidos cargados.
              </p>
            ) : (
              <>
                <label className="text-sm font-black uppercase text-slate-500">
                  Grupo
                </label>

                <select
                  value={grupoActivo}
                  onChange={(event) => cambiarGrupo(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  {grupos.map((grupo) => (
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
                  {matchesGrupo.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.home_team?.name ?? "Local"} vs{" "}
                      {match.away_team?.name ?? "Visitante"} ·{" "}
                      {match.match_date} · {match.match_time}
                    </option>
                  ))}
                </select>

                {selectedMatch ? (
                  <>
                    <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                      <p className="text-sm font-black text-red-600">
                        {selectedMatch.group_name}
                      </p>
                      <h2 className="mt-1 text-xl font-black">
                        {selectedMatch.home_team?.name} vs{" "}
                        {selectedMatch.away_team?.name}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {selectedMatch.match_date} ·{" "}
                        {selectedMatch.match_time} · {selectedMatch.field}
                      </p>
                      <p className="mt-2 text-sm font-black">
                        Estado votación:{" "}
                        <span
                          className={
                            selectedMatch.mvp_open
                              ? "text-emerald-700"
                              : "text-red-600"
                          }
                        >
                          {selectedMatch.mvp_open ? "Abierta" : "Cerrada"}
                        </span>
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        Total votos: {totalVotos}
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
                    No hay partidos cargados en este grupo.
                  </p>
                )}

                {mensaje && (
                  <div className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm font-bold text-emerald-800">
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