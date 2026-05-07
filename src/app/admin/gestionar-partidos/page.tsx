"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

const CLASIFICACION = "Clasificación";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

type Match = {
  id: string;
  group_name: string | null;
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

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

export default function AdminGestionarPartidosPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [selectedId, setSelectedId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [campo, setCampo] = useState("Campo 1");
  const [estado, setEstado] = useState("Pendiente");
  const [mvpOpen, setMvpOpen] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos(mantenerId?: string) {
    setLoading(true);

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("name", { ascending: true });

    if (teamsError) {
      console.error("Error cargando equipos:", teamsError);
      setMensaje("Error cargando equipos.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

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
        status,
        mvp_open,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `
      )
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      console.error("Error cargando partidos:", matchesError);
      setMensaje("Error cargando partidos de clasificación.");
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

    const partidoMantener = mantenerId
      ? partidos.find((match) => match.id === mantenerId)
      : null;

    if (partidoMantener) {
      cargarPartido(partidoMantener);
    } else if (!selectedId) {
      prepararNuevo(equipos);
    }

    setLoading(false);
  }

  function prepararNuevo(equiposBase = teams) {
    setSelectedId("");
    setHomeTeamId(equiposBase[0]?.id ?? "");
    setAwayTeamId(equiposBase[1]?.id ?? "");
    setFecha("");
    setHora("");
    setCampo("Campo 1");
    setEstado("Pendiente");
    setMvpOpen(false);
    setMensaje("");
  }

  function cargarPartido(match: Match) {
    setSelectedId(match.id);
    setHomeTeamId(match.home_team_id);
    setAwayTeamId(match.away_team_id);
    setFecha(match.match_date ?? "");
    setHora(match.match_time ?? "");
    setCampo(match.field ?? "Campo 1");
    setEstado(match.status ?? "Pendiente");
    setMvpOpen(Boolean(match.mvp_open));
    setMensaje("");
  }

  function cambiarPartido(id: string) {
    if (!id) {
      prepararNuevo();
      return;
    }

    const match = matches.find((item) => item.id === id);

    if (match) {
      cargarPartido(match);
    }
  }

  function validarPartido() {
    if (!homeTeamId || !awayTeamId) {
      setMensaje("Selecciona los dos equipos.");
      return false;
    }

    if (homeTeamId === awayTeamId) {
      setMensaje("El equipo local y visitante no pueden ser el mismo.");
      return false;
    }

    if (!fecha) {
      setMensaje("Indica la fecha del partido.");
      return false;
    }

    if (!hora) {
      setMensaje("Indica la hora del partido.");
      return false;
    }

    if (!campo.trim()) {
      setMensaje("Indica el campo.");
      return false;
    }

    return true;
  }

  async function guardarPartido() {
    if (!validarPartido()) return;

    setSaving(true);
    setMensaje("");

    const payload = {
      group_name: CLASIFICACION,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: fecha,
      match_time: hora,
      field: campo.trim(),
      status: estado,
      mvp_open: mvpOpen,
    };

    const { error } = selectedId
      ? await supabase.from("matches").update(payload).eq("id", selectedId)
      : await supabase.from("matches").insert({
          ...payload,
          home_score: null,
          away_score: null,
        });

    if (error) {
      console.error("Error guardando partido:", error);
      setMensaje("No se ha podido guardar el partido.");
      setSaving(false);
      return;
    }

    setMensaje(
      selectedId
        ? "Partido actualizado correctamente."
        : "Partido creado correctamente."
    );

    await cargarDatos(selectedId);
    setSaving(false);
  }

  async function eliminarPartido() {
    if (!selectedId) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar este partido?\n\nTambién se eliminarán datos relacionados si existen."
    );

    if (!confirmar) return;

    setSaving(true);
    setMensaje("");

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", selectedId);

    if (error) {
      console.error("Error eliminando partido:", error);
      setMensaje("No se ha podido eliminar el partido.");
      setSaving(false);
      return;
    }

    setMensaje("Partido eliminado correctamente.");
    setSelectedId("");
    prepararNuevo();
    await cargarDatos();
    setSaving(false);
  }

  const mensajeCorrecto =
    mensaje.includes("correctamente") || mensaje.includes("eliminado");

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
              Configurar partidos
            </h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Partidos de clasificación
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
              Cargando partidos...
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <label className="text-sm font-black uppercase text-slate-500">
                  Partido existente
                </label>

                <select
                  value={selectedId}
                  onChange={(event) => cambiarPartido(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="">Nuevo partido</option>

                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.home_team?.name ?? "Local"} vs{" "}
                      {match.away_team?.name ?? "Visitante"} ·{" "}
                      {formatearFechaSegura(match.match_date)} ·{" "}
                      {match.match_time ?? "Hora pendiente"}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => prepararNuevo()}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                >
                  Crear nuevo partido
                </button>
              </div>

              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Fase
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-950">
                    Clasificación
                  </p>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-black uppercase text-slate-500">
                    Equipo local
                  </label>

                  <select
                    value={homeTeamId}
                    onChange={(event) => setHomeTeamId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    <option value="">Selecciona equipo local</option>

                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-black uppercase text-slate-500">
                    Equipo visitante
                  </label>

                  <select
                    value={awayTeamId}
                    onChange={(event) => setAwayTeamId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    <option value="">Selecciona equipo visitante</option>

                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
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
                    <label className="text-xs font-black uppercase text-slate-500">
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
                  <label className="text-xs font-black uppercase text-slate-500">
                    Campo
                  </label>

                  <input
                    value={campo}
                    onChange={(event) => setCampo(event.target.value)}
                    placeholder="Campo 1"
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs font-black uppercase text-slate-500">
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

                <label className="mt-4 flex items-center justify-between rounded-2xl bg-slate-100 p-4 font-black">
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
                  disabled={saving}
                  className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar partido"}
                </button>

                {selectedId && (
                  <button
                    onClick={eliminarPartido}
                    disabled={saving}
                    className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-60"
                  >
                    Eliminar partido
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}