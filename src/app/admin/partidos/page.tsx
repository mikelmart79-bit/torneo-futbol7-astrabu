"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Group = {
  id: string;
  name: string;
  sort_order: number;
};

type Match = {
  id: string;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
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

export default function AdminPartidosPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [grupoActivo, setGrupoActivo] = useState("");
  const [partidoId, setPartidoId] = useState("");
  const [golesLocal, setGolesLocal] = useState("");
  const [golesVisitante, setGolesVisitante] = useState("");
  const [estado, setEstado] = useState("Pendiente");
  const [mvpOpen, setMvpOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const partidosGrupo = matches.filter(
    (match) => match.group_name === grupoActivo
  );

  const partido = partidosGrupo.find((match) => match.id === partidoId);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos(partidoMantenerId?: string, grupoMantener?: string) {
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

    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
        group_name,
        match_date,
        match_time,
        field,
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
      console.error("Error cargando partidos:", error);
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

    const grupoInicial =
      grupoMantener || grupoActivo || grupos[0]?.name || partidos[0]?.group_name || "";

    setGrupoActivo(grupoInicial);

    const partidoMantener = partidoMantenerId
      ? partidos.find((match) => match.id === partidoMantenerId)
      : null;

    const primerPartido = partidoMantener
      ?? partidos.find((match) => match.group_name === grupoInicial)
      ?? null;

    if (primerPartido) {
      seleccionarPartido(primerPartido);
    } else {
      limpiarPartido();
    }

    setLoading(false);
  }

  function seleccionarPartido(match: Match) {
    setPartidoId(match.id);
    setGolesLocal(match.home_score?.toString() ?? "");
    setGolesVisitante(match.away_score?.toString() ?? "");
    setEstado(match.status ?? "Pendiente");
    setMvpOpen(Boolean(match.mvp_open));
    setMensaje("");
  }

  function limpiarPartido() {
    setPartidoId("");
    setGolesLocal("");
    setGolesVisitante("");
    setEstado("Pendiente");
    setMvpOpen(false);
  }

  function cambiarGrupo(grupo: string) {
    setGrupoActivo(grupo);

    const primerPartidoGrupo = matches.find(
      (match) => match.group_name === grupo
    );

    if (primerPartidoGrupo) {
      seleccionarPartido(primerPartidoGrupo);
    } else {
      limpiarPartido();
    }
  }

  function cambiarPartido(id: string) {
    const nuevoPartido = matches.find((match) => match.id === id);
    if (!nuevoPartido) return;
    seleccionarPartido(nuevoPartido);
  }

  function validarResultado() {
    if (!partido) {
      setMensaje("Selecciona un partido.");
      return false;
    }

    const localVacio = golesLocal.trim() === "";
    const visitanteVacio = golesVisitante.trim() === "";

    if (localVacio !== visitanteVacio) {
      setMensaje("Indica los goles de los dos equipos o deja ambos vacíos.");
      return false;
    }

    if (!localVacio && Number.parseInt(golesLocal, 10) < 0) {
      setMensaje("Los goles del equipo local no pueden ser negativos.");
      return false;
    }

    if (!visitanteVacio && Number.parseInt(golesVisitante, 10) < 0) {
      setMensaje("Los goles del equipo visitante no pueden ser negativos.");
      return false;
    }

    return true;
  }

  async function guardarResultado() {
    if (!validarResultado() || !partido) return;

    const local =
      golesLocal.trim() === "" ? null : Number.parseInt(golesLocal, 10);
    const visitante =
      golesVisitante.trim() === "" ? null : Number.parseInt(golesVisitante, 10);

    const { error } = await supabase
      .from("matches")
      .update({
        home_score: local,
        away_score: visitante,
        status: estado,
        mvp_open: mvpOpen,
      })
      .eq("id", partido.id);

    if (error) {
      console.error("Error guardando resultado:", error);
      setMensaje("No se ha podido guardar el resultado.");
      return;
    }

    setMensaje(
      `Resultado guardado: ${partido.home_team?.name ?? "Local"} ${
        local ?? "-"
      } - ${visitante ?? "-"} ${partido.away_team?.name ?? "Visitante"}`
    );

    await cargarDatos(partido.id, grupoActivo);
  }

  const mensajeCorrecto = mensaje.includes("guardado");

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
              Resultados
            </h1>
            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Marcadores de fase de grupos
            </p>
          </div>

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            {loading ? (
              <p className="font-bold">Cargando partidos...</p>
            ) : groups.length === 0 ? (
              <p className="rounded-2xl bg-slate-100 p-4 font-bold text-slate-500">
                Todavía no hay grupos creados.
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
                  {groups.map((grupo) => (
                    <option key={grupo.id} value={grupo.name}>
                      {grupo.name}
                    </option>
                  ))}
                </select>

                <label className="mt-5 block text-sm font-black uppercase text-slate-500">
                  Partido
                </label>

                <select
                  value={partidoId}
                  onChange={(event) => cambiarPartido(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  {partidosGrupo.length === 0 ? (
                    <option value="">No hay partidos en este grupo</option>
                  ) : (
                    partidosGrupo.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.home_team?.name ?? "Local"} vs{" "}
                        {match.away_team?.name ?? "Visitante"} ·{" "}
                        {formatearFechaSegura(match.match_date)} ·{" "}
                        {match.match_time ?? "Hora pendiente"}
                      </option>
                    ))
                  )}
                </select>

                {partido ? (
                  <>
                    <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                      <p className="text-sm font-black text-red-600">
                        {partido.group_name}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {formatearFechaSegura(partido.match_date)} ·{" "}
                        {partido.match_time ?? "Hora pendiente"} ·{" "}
                        {partido.field ?? "Campo pendiente"}
                      </p>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="grid grid-cols-[1fr_82px] items-center gap-3 rounded-2xl bg-slate-50 p-3">
                        <p className="break-words font-black leading-tight">
                          {partido.home_team?.name ?? "Local"}
                        </p>
                        <input
                          type="number"
                          min="0"
                          value={golesLocal}
                          onChange={(event) => setGolesLocal(event.target.value)}
                          className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                        />
                      </div>

                      <div className="grid grid-cols-[1fr_82px] items-center gap-3 rounded-2xl bg-slate-50 p-3">
                        <p className="break-words font-black leading-tight">
                          {partido.away_team?.name ?? "Visitante"}
                        </p>
                        <input
                          type="number"
                          min="0"
                          value={golesVisitante}
                          onChange={(event) =>
                            setGolesVisitante(event.target.value)
                          }
                          className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                        />
                      </div>
                    </div>

                    <div className="mt-5">
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
                      onClick={guardarResultado}
                      className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                    >
                      Guardar resultado
                    </button>

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
                ) : (
                  <p className="mt-5 rounded-2xl bg-slate-100 p-4 font-bold text-slate-500">
                    No hay partidos cargados en este grupo.
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </AdminGuard>
  );
}