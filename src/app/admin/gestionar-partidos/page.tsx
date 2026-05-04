"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Group = {
  id: string;
  name: string;
  sort_order: number;
};

type Team = {
  id: string;
  name: string;
  group_name: string;
};

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

function normalizarEquipo(
  equipo: RawMatch["home_team"]
): { name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

export default function AdminGestionarPartidosPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [selectedId, setSelectedId] = useState("");
  const [grupo, setGrupo] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [campo, setCampo] = useState("Campo 1");
  const [estado, setEstado] = useState("Pendiente");
  const [mvpOpen, setMvpOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const teamsGrupo = teams.filter((team) => team.group_name === grupo);
  const matchesGrupo = matches.filter((match) => match.group_name === grupo);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const { data: groupsData } = await supabase
      .from("groups")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true });

    const grupos = (groupsData ?? []) as Group[];
    setGroups(grupos);

    const grupoInicial = grupos[0]?.name ?? "";
    setGrupo(grupoInicial);

    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("group_name", { ascending: true })
      .order("name", { ascending: true });

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

    const primerosEquipos = equipos.filter(
      (team) => team.group_name === grupoInicial
    );

    setHomeTeamId(primerosEquipos[0]?.id ?? "");
    setAwayTeamId(primerosEquipos[1]?.id ?? "");

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
        status,
        mvp_open,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .order("group_name", { ascending: true })
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      setMensaje("Error cargando partidos.");
      setLoading(false);
      return;
    }

    const partidos: Match[] = ((matchesData as unknown as RawMatch[]) || []).map(
      (match) => ({
        ...match,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      })
    );

    setMatches(partidos);
    setLoading(false);
  }

  function limpiarFormulario() {
    const equiposGrupo = teams.filter((team) => team.group_name === grupo);

    setSelectedId("");
    setHomeTeamId(equiposGrupo[0]?.id ?? "");
    setAwayTeamId(equiposGrupo[1]?.id ?? "");
    setFecha("");
    setHora("");
    setCampo("Campo 1");
    setEstado("Pendiente");
    setMvpOpen(false);
    setMensaje("");
  }

  function cambiarGrupo(nuevoGrupo: string) {
    setGrupo(nuevoGrupo);

    const equiposGrupo = teams.filter((team) => team.group_name === nuevoGrupo);

    setSelectedId("");
    setHomeTeamId(equiposGrupo[0]?.id ?? "");
    setAwayTeamId(equiposGrupo[1]?.id ?? "");
    setFecha("");
    setHora("");
    setCampo("Campo 1");
    setEstado("Pendiente");
    setMvpOpen(false);
    setMensaje("");
  }

  function cargarPartido(match: Match) {
    setSelectedId(match.id);
    setGrupo(match.group_name);
    setHomeTeamId(match.home_team_id);
    setAwayTeamId(match.away_team_id);
    setFecha(match.match_date ?? "");
    setHora(match.match_time ?? "");
    setCampo(match.field ?? "");
    setEstado(match.status ?? "Pendiente");
    setMvpOpen(Boolean(match.mvp_open));
    setMensaje("");
  }

  function cambiarPartido(id: string) {
    if (!id) {
      limpiarFormulario();
      return;
    }

    const match = matches.find((item) => item.id === id);
    if (match) cargarPartido(match);
  }

  async function guardarPartido() {
    if (!grupo) {
      setMensaje("Selecciona un grupo.");
      return;
    }

    if (!homeTeamId || !awayTeamId) {
      setMensaje("Selecciona los dos equipos.");
      return;
    }

    if (homeTeamId === awayTeamId) {
      setMensaje("El equipo local y visitante no pueden ser el mismo.");
      return;
    }

    if (!fecha || !hora) {
      setMensaje("Indica fecha y hora del partido.");
      return;
    }

    const payload = {
      group_name: grupo,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: fecha,
      match_time: hora,
      field: campo || "Campo 1",
      status: estado,
      mvp_open: mvpOpen,
    };

    const { error } = selectedId
      ? await supabase.from("matches").update(payload).eq("id", selectedId)
      : await supabase.from("matches").insert(payload);

    if (error) {
      setMensaje(`No se ha podido guardar el partido: ${error.message}`);
      return;
    }

    setMensaje("Partido guardado correctamente.");
    await cargarDatos();
  }

  async function eliminarPartido() {
    if (!selectedId) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar este partido?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", selectedId);

    if (error) {
      setMensaje(`No se ha podido eliminar el partido: ${error.message}`);
      return;
    }

    setMensaje("Partido eliminado.");
    limpiarFormulario();
    await cargarDatos();
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
              Gestionar partidos
            </h1>
          </div>

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            {loading ? (
              <p className="font-bold text-slate-500">Cargando datos...</p>
            ) : groups.length === 0 ? (
              <p className="font-bold text-slate-500">
                Primero crea al menos un grupo.
              </p>
            ) : (
              <>
                <label className="text-sm font-black uppercase text-slate-500">
                  Grupo
                </label>

                <select
                  value={grupo}
                  onChange={(event) => cambiarGrupo(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </select>

                <label className="mt-5 block text-sm font-black uppercase text-slate-500">
                  Partido existente
                </label>

                <select
                  value={selectedId}
                  onChange={(event) => cambiarPartido(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="">Nuevo partido</option>
                  {matchesGrupo.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.home_team?.name ?? "Local"} vs{" "}
                      {match.away_team?.name ?? "Visitante"} ·{" "}
                      {match.match_date} · {match.match_time}
                    </option>
                  ))}
                </select>

                <button
                  onClick={limpiarFormulario}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                >
                  Crear nuevo partido
                </button>
              </>
            )}
          </div>

          {!loading && groups.length > 0 && (
            <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
              <div>
                <label className="text-sm font-black uppercase text-slate-500">
                  Equipo local
                </label>

                <select
                  value={homeTeamId}
                  onChange={(event) => setHomeTeamId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="">Selecciona equipo</option>
                  {teamsGrupo.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label className="text-sm font-black uppercase text-slate-500">
                  Equipo visitante
                </label>

                <select
                  value={awayTeamId}
                  onChange={(event) => setAwayTeamId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="">Selecciona equipo</option>
                  {teamsGrupo.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-black uppercase text-slate-500">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                  />
                </div>

                <div>
                  <label className="text-sm font-black uppercase text-slate-500">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(event) => setHora(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-black uppercase text-slate-500">
                  Campo
                </label>
                <input
                  value={campo}
                  onChange={(event) => setCampo(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                  placeholder="Campo 1"
                />
              </div>

              <div className="mt-4">
                <label className="text-sm font-black uppercase text-slate-500">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={(event) => setEstado(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option>Pendiente</option>
                  <option>En juego</option>
                  <option>Finalizado</option>
                  <option>Cerrado</option>
                </select>
              </div>

              <label className="mt-5 flex items-center justify-between rounded-2xl bg-slate-100 p-4 font-black">
                <span>Abrir votación MVP</span>
                <input
                  type="checkbox"
                  checked={mvpOpen}
                  onChange={(event) => setMvpOpen(event.target.checked)}
                  className="h-6 w-6"
                />
              </label>

              <button
                onClick={guardarPartido}
                className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
              >
                Guardar partido
              </button>

              {selectedId && (
                <button
                  onClick={eliminarPartido}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                >
                  Eliminar partido
                </button>
              )}

              {mensaje && (
                <div className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm font-bold text-emerald-800">
                  {mensaje}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}