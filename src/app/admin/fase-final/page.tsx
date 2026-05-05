"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type SourceType = "group_position" | "winner" | "loser" | "manual";

type FinalMatch = {
  id: string;
  phase: string;
  title: string;
  home_ref: string;
  away_ref: string;
  home_position: number | null;
  home_group: string | null;
  away_position: number | null;
  away_group: string | null;
  home_source_type: SourceType | null;
  home_source_match_title: string | null;
  away_source_type: SourceType | null;
  away_source_match_title: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  sort_order: number;
};

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

export default function AdminFaseFinalPage() {
  const [matches, setMatches] = useState<FinalMatch[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState("Cuartos");
  const [title, setTitle] = useState("");

  const [homeSourceType, setHomeSourceType] =
    useState<SourceType>("group_position");
  const [homeRef, setHomeRef] = useState("");
  const [homePosition, setHomePosition] = useState("1");
  const [homeGroup, setHomeGroup] = useState("");
  const [homeSourceMatchTitle, setHomeSourceMatchTitle] = useState("");

  const [awaySourceType, setAwaySourceType] =
    useState<SourceType>("group_position");
  const [awayRef, setAwayRef] = useState("");
  const [awayPosition, setAwayPosition] = useState("2");
  const [awayGroup, setAwayGroup] = useState("");
  const [awaySourceMatchTitle, setAwaySourceMatchTitle] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [field, setField] = useState("");
  const [sortOrder, setSortOrder] = useState("1");

  useEffect(() => {
    cargarDatos();
  }, []);

  const grupos = useMemo(() => {
    return Array.from(
      new Set(
        teams
          .map((team) => team.group_name)
          .filter((group): group is string => Boolean(group))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [teams]);

  async function cargarDatos() {
    setLoading(true);
    await Promise.all([cargarCruces(), cargarEquipos()]);
    setLoading(false);
  }

  async function cargarCruces() {
    const { data, error } = await supabase
      .from("final_matches")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      setMensaje("No se han podido cargar los cruces.");
      return;
    }

    const rows = (data ?? []) as FinalMatch[];
    setMatches(rows);

    if (rows.length > 0 && !selectedId) {
      cargarEnFormulario(rows[0]);
    }
  }

  async function cargarEquipos() {
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("group_name", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setMensaje("No se han podido cargar los equipos.");
      return;
    }

    setTeams((data ?? []) as Team[]);
  }

  function cargarEnFormulario(match: FinalMatch) {
    setSelectedId(match.id);
    setPhase(match.phase);
    setTitle(match.title);

    setHomeSourceType(match.home_source_type ?? "manual");
    setHomeRef(match.home_ref ?? "");
    setHomePosition(match.home_position?.toString() ?? "1");
    setHomeGroup(match.home_group ?? "");
    setHomeSourceMatchTitle(match.home_source_match_title ?? "");

    setAwaySourceType(match.away_source_type ?? "manual");
    setAwayRef(match.away_ref ?? "");
    setAwayPosition(match.away_position?.toString() ?? "2");
    setAwayGroup(match.away_group ?? "");
    setAwaySourceMatchTitle(match.away_source_match_title ?? "");

    setDate(match.match_date ?? "");
    setTime(match.match_time ?? "");
    setField(match.field ?? "");
    setSortOrder(match.sort_order.toString());
    setMensaje("");
  }

  function nuevoCruce() {
    setSelectedId("");
    setPhase("Cuartos");
    setTitle("");

    setHomeSourceType("group_position");
    setHomeRef("");
    setHomePosition("1");
    setHomeGroup(grupos[0] ?? "");
    setHomeSourceMatchTitle("");

    setAwaySourceType("group_position");
    setAwayRef("");
    setAwayPosition("2");
    setAwayGroup(grupos[1] ?? grupos[0] ?? "");
    setAwaySourceMatchTitle("");

    setDate("");
    setTime("");
    setField("");
    setSortOrder((matches.length + 1).toString());
    setMensaje("");
  }

  function labelPosicion(posicion: string | number | null, grupo: string | null) {
    if (!posicion || !grupo) return "";
    return `${posicion}º ${grupo}`;
  }

  function referenciaPreviaLado(
    tipo: SourceType,
    posicion: string,
    grupo: string,
    sourceMatchTitle: string,
    manualRef: string
  ) {
    if (tipo === "group_position") return labelPosicion(posicion, grupo);
    if (tipo === "winner")
      return sourceMatchTitle ? `Ganador ${sourceMatchTitle}` : "";
    if (tipo === "loser")
      return sourceMatchTitle ? `Perdedor ${sourceMatchTitle}` : "";
    return manualRef;
  }

  function validarCruce() {
    if (!title.trim()) {
      setMensaje("Debes indicar el nombre del cruce.");
      return false;
    }

    if (homeSourceType === "group_position" && !homeGroup) {
      setMensaje("Debes elegir el grupo del equipo local.");
      return false;
    }

    if (awaySourceType === "group_position" && !awayGroup) {
      setMensaje("Debes elegir el grupo del equipo visitante.");
      return false;
    }

    if (
      (homeSourceType === "winner" || homeSourceType === "loser") &&
      !homeSourceMatchTitle
    ) {
      setMensaje("Debes elegir el cruce de origen del equipo local.");
      return false;
    }

    if (
      (awaySourceType === "winner" || awaySourceType === "loser") &&
      !awaySourceMatchTitle
    ) {
      setMensaje("Debes elegir el cruce de origen del equipo visitante.");
      return false;
    }

    if (homeSourceType === "manual" && !homeRef.trim()) {
      setMensaje("Debes escribir el equipo local manualmente.");
      return false;
    }

    if (awaySourceType === "manual" && !awayRef.trim()) {
      setMensaje("Debes escribir el equipo visitante manualmente.");
      return false;
    }

    return true;
  }

  async function guardarCruce() {
    if (!validarCruce()) return;

    const payloadBase = {
      phase,
      title: title.trim(),
      home_ref: referenciaPreviaLado(
        homeSourceType,
        homePosition,
        homeGroup,
        homeSourceMatchTitle,
        homeRef
      ),
      away_ref: referenciaPreviaLado(
        awaySourceType,
        awayPosition,
        awayGroup,
        awaySourceMatchTitle,
        awayRef
      ),
      home_position:
        homeSourceType === "group_position" ? Number(homePosition) : null,
      home_group: homeSourceType === "group_position" ? homeGroup || null : null,
      away_position:
        awaySourceType === "group_position" ? Number(awayPosition) : null,
      away_group: awaySourceType === "group_position" ? awayGroup || null : null,
      home_source_type: homeSourceType,
      home_source_match_title:
        homeSourceType === "winner" || homeSourceType === "loser"
          ? homeSourceMatchTitle || null
          : null,
      away_source_type: awaySourceType,
      away_source_match_title:
        awaySourceType === "winner" || awaySourceType === "loser"
          ? awaySourceMatchTitle || null
          : null,
      match_date: date || null,
      match_time: time || null,
      field: field || null,
      sort_order: Number(sortOrder) || 1,
    };

    const { error } = selectedId
      ? await supabase
          .from("final_matches")
          .update(payloadBase)
          .eq("id", selectedId)
      : await supabase.from("final_matches").insert({
          ...payloadBase,
          home_score: null,
          away_score: null,
          home_penalties: null,
          away_penalties: null,
          status: "Pendiente",
          mvp_open: false,
        });

    if (error) {
      console.error(error);
      setMensaje("No se ha podido guardar el cruce.");
      return;
    }

    setMensaje("Cruce guardado correctamente.");
    await cargarCruces();
  }

  async function eliminarCruce() {
    if (!selectedId) return;

    const confirmar = window.confirm("¿Seguro que quieres eliminar este cruce?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("final_matches")
      .delete()
      .eq("id", selectedId);

    if (error) {
      setMensaje("No se ha podido eliminar el cruce.");
      return;
    }

    setMensaje("Cruce eliminado.");
    setSelectedId("");
    await cargarCruces();
  }

  const opcionesCrucesFuente = matches.filter((match) => match.id !== selectedId);

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
            <h1 className="mt-2 text-center text-3xl font-black">Fase final</h1>
          </div>

          {loading ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Cargando fase final...
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <label className="text-sm font-black uppercase text-slate-500">
                  Cruce existente
                </label>

                <select
                  value={selectedId}
                  onChange={(e) => {
                    const match = matches.find((m) => m.id === e.target.value);
                    if (match) cargarEnFormulario(match);
                    if (!e.target.value) nuevoCruce();
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="">Nuevo cruce</option>
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.sort_order}. {match.phase} · {match.title}
                    </option>
                  ))}
                </select>

                <button
                  onClick={nuevoCruce}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                >
                  Crear nuevo cruce
                </button>
              </div>

              <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Fase
                    </label>
                    <select
                      value={phase}
                      onChange={(e) => setPhase(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                    >
                      <option>Cuartos</option>
                      <option>Semifinales</option>
                      <option>Tercer puesto</option>
                      <option>Final</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Orden
                    </label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-black uppercase text-slate-500">
                    Nombre del cruce
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Cuarto 1, Semifinal 1, Final..."
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm font-black uppercase text-red-600">
                    Equipo local
                  </p>

                  <label className="mt-3 block text-xs font-black uppercase text-slate-500">
                    Origen
                  </label>
                  <select
                    value={homeSourceType}
                    onChange={(e) =>
                      setHomeSourceType(e.target.value as SourceType)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    <option value="group_position">Clasificación grupo</option>
                    <option value="winner">Ganador de cruce</option>
                    <option value="loser">Perdedor de cruce</option>
                    <option value="manual">Manual</option>
                  </select>

                  {homeSourceType === "group_position" && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <select
                        value={homePosition}
                        onChange={(e) => setHomePosition(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white p-3 font-bold"
                      >
                        <option value="1">1º</option>
                        <option value="2">2º</option>
                        <option value="3">3º</option>
                        <option value="4">4º</option>
                        <option value="5">5º</option>
                        <option value="6">6º</option>
                      </select>

                      <select
                        value={homeGroup}
                        onChange={(e) => setHomeGroup(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white p-3 font-bold"
                      >
                        <option value="">Grupo</option>
                        {grupos.map((grupo) => (
                          <option key={grupo} value={grupo}>
                            {grupo}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(homeSourceType === "winner" ||
                    homeSourceType === "loser") && (
                    <select
                      value={homeSourceMatchTitle}
                      onChange={(e) => setHomeSourceMatchTitle(e.target.value)}
                      className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                    >
                      <option value="">Elegir cruce</option>
                      {opcionesCrucesFuente.map((match) => (
                        <option key={match.id} value={match.title}>
                          {match.title}
                        </option>
                      ))}
                    </select>
                  )}

                  {homeSourceType === "manual" && (
                    <input
                      value={homeRef}
                      onChange={(e) => setHomeRef(e.target.value)}
                      placeholder="Equipo local"
                      className="mt-3 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    />
                  )}
                </div>

                <div className="mt-4 rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm font-black uppercase text-red-600">
                    Equipo visitante
                  </p>

                  <label className="mt-3 block text-xs font-black uppercase text-slate-500">
                    Origen
                  </label>
                  <select
                    value={awaySourceType}
                    onChange={(e) =>
                      setAwaySourceType(e.target.value as SourceType)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    <option value="group_position">Clasificación grupo</option>
                    <option value="winner">Ganador de cruce</option>
                    <option value="loser">Perdedor de cruce</option>
                    <option value="manual">Manual</option>
                  </select>

                  {awaySourceType === "group_position" && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <select
                        value={awayPosition}
                        onChange={(e) => setAwayPosition(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white p-3 font-bold"
                      >
                        <option value="1">1º</option>
                        <option value="2">2º</option>
                        <option value="3">3º</option>
                        <option value="4">4º</option>
                        <option value="5">5º</option>
                        <option value="6">6º</option>
                      </select>

                      <select
                        value={awayGroup}
                        onChange={(e) => setAwayGroup(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white p-3 font-bold"
                      >
                        <option value="">Grupo</option>
                        {grupos.map((grupo) => (
                          <option key={grupo} value={grupo}>
                            {grupo}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(awaySourceType === "winner" ||
                    awaySourceType === "loser") && (
                    <select
                      value={awaySourceMatchTitle}
                      onChange={(e) => setAwaySourceMatchTitle(e.target.value)}
                      className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                    >
                      <option value="">Elegir cruce</option>
                      {opcionesCrucesFuente.map((match) => (
                        <option key={match.id} value={match.title}>
                          {match.title}
                        </option>
                      ))}
                    </select>
                  )}

                  {awaySourceType === "manual" && (
                    <input
                      value={awayRef}
                      onChange={(e) => setAwayRef(e.target.value)}
                      placeholder="Equipo visitante"
                      className="mt-3 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    />
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-xl border border-slate-300 p-3 font-bold"
                  />

                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="rounded-xl border border-slate-300 p-3 font-bold"
                  />
                </div>

                <input
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  placeholder="Campo"
                  className="mt-4 w-full rounded-xl border border-slate-300 p-3 font-bold"
                />

                <button
                  onClick={guardarCruce}
                  className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                >
                  Guardar cruce
                </button>

                {selectedId && (
                  <button
                    onClick={eliminarCruce}
                    className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                  >
                    Eliminar cruce
                  </button>
                )}

                {mensaje && (
                  <div
                    className={`mt-4 rounded-xl p-3 text-sm font-bold ${
                      mensaje.includes("correctamente") ||
                      mensaje.includes("eliminado")
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {mensaje}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}