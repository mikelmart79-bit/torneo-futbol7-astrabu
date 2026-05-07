"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type SourceType = "manual" | "winner" | "loser" | "group_position";

type FinalMatch = {
  id: string;
  phase: string;
  title: string;
  home_ref: string;
  away_ref: string;
  home_source_type: SourceType | null;
  home_source_match_title: string | null;
  away_source_type: SourceType | null;
  away_source_match_title: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: string | null;
  mvp_open: boolean | null;
  sort_order: number;
};

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

type GroupMatch = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
};

type TableRow = {
  teamId: string;
  teamName: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

type NewFinalMatch = {
  phase: string;
  title: string;
  home_ref: string;
  away_ref: string;
  home_source_type: SourceType;
  home_source_match_title: string | null;
  away_source_type: SourceType;
  away_source_match_title: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: string;
  mvp_open: boolean;
  sort_order: number;
};

const OCTAVOS_PAIRS = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [3, 14],
  [6, 11],
  [7, 10],
  [2, 15],
];

const OCTAVOS_DATES = [
  "2026-07-20",
  "2026-07-21",
  "2026-07-22",
  "2026-07-22",
  "2026-07-23",
  "2026-07-23",
  "2026-07-24",
  "2026-07-24",
];

const CUARTOS_DATES = [
  "2026-07-27",
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
];

const SEMIS_DATES = ["2026-08-03", "2026-08-04"];

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

function normalizarSourceType(value: SourceType | null | undefined): SourceType {
  if (value === "winner" || value === "loser" || value === "group_position") {
    return value;
  }

  return "manual";
}

function sourceEditable(value: SourceType) {
  return value === "manual" || value === "winner" || value === "loser";
}

export default function AdminFaseFinalPage() {
  const [matches, setMatches] = useState<FinalMatch[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [phase, setPhase] = useState("Octavos");
  const [title, setTitle] = useState("");

  const [homeSourceType, setHomeSourceType] = useState<SourceType>("manual");
  const [homeRef, setHomeRef] = useState("");
  const [homeSourceMatchTitle, setHomeSourceMatchTitle] = useState("");

  const [awaySourceType, setAwaySourceType] = useState<SourceType>("manual");
  const [awayRef, setAwayRef] = useState("");
  const [awaySourceMatchTitle, setAwaySourceMatchTitle] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [field, setField] = useState("");
  const [sortOrder, setSortOrder] = useState("1");

  useEffect(() => {
    cargarCruces();
  }, []);

  async function cargarCruces(mantenerId?: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("final_matches")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error cargando eliminatorias:", error);
      setMensaje("No se han podido cargar las eliminatorias.");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as FinalMatch[];
    setMatches(rows);

    const matchMantener = mantenerId
      ? rows.find((match) => match.id === mantenerId)
      : null;

    if (matchMantener) {
      cargarEnFormulario(matchMantener);
    } else if (rows.length > 0) {
      cargarEnFormulario(rows[0]);
    } else {
      nuevoCruce(1);
    }

    setLoading(false);
  }

  function cargarEnFormulario(match: FinalMatch) {
    const homeType = normalizarSourceType(match.home_source_type);
    const awayType = normalizarSourceType(match.away_source_type);

    setSelectedId(match.id);
    setPhase(match.phase);
    setTitle(match.title);

    setHomeSourceType(sourceEditable(homeType) ? homeType : "manual");
    setHomeRef(match.home_ref ?? "");
    setHomeSourceMatchTitle(match.home_source_match_title ?? "");

    setAwaySourceType(sourceEditable(awayType) ? awayType : "manual");
    setAwayRef(match.away_ref ?? "");
    setAwaySourceMatchTitle(match.away_source_match_title ?? "");

    setDate(match.match_date ?? "");
    setTime(match.match_time ?? "");
    setField(match.field ?? "");
    setSortOrder(match.sort_order.toString());
    setMensaje("");
  }

  function nuevoCruce(orden?: number) {
    setSelectedId("");
    setPhase("Octavos");
    setTitle("");
    setHomeSourceType("manual");
    setHomeRef("");
    setHomeSourceMatchTitle("");
    setAwaySourceType("manual");
    setAwayRef("");
    setAwaySourceMatchTitle("");
    setDate("");
    setTime("");
    setField("");
    setSortOrder((orden ?? matches.length + 1).toString());
    setMensaje("");
  }

  function referenciaLado(
    tipo: SourceType,
    sourceMatchTitle: string,
    manualRef: string
  ) {
    if (tipo === "winner") {
      return sourceMatchTitle ? `Ganador ${sourceMatchTitle}` : "";
    }

    if (tipo === "loser") {
      return sourceMatchTitle ? `Perdedor ${sourceMatchTitle}` : "";
    }

    return manualRef.trim();
  }

  function validarCruce() {
    if (!phase.trim()) {
      setMensaje("Debes indicar la fase.");
      return false;
    }

    if (!title.trim()) {
      setMensaje("Debes indicar el nombre del cruce.");
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
      setMensaje("Debes indicar el equipo local.");
      return false;
    }

    if (awaySourceType === "manual" && !awayRef.trim()) {
      setMensaje("Debes indicar el equipo visitante.");
      return false;
    }

    return true;
  }

  async function guardarCruce() {
    if (!validarCruce()) return;

    setSaving(true);
    setMensaje("");

    const payloadBase = {
      phase,
      title: title.trim(),
      home_ref: referenciaLado(
        homeSourceType,
        homeSourceMatchTitle,
        homeRef
      ),
      away_ref: referenciaLado(
        awaySourceType,
        awaySourceMatchTitle,
        awayRef
      ),
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
      console.error("Error guardando cruce:", error);
      setMensaje("No se ha podido guardar el cruce.");
      setSaving(false);
      return;
    }

    setMensaje("Cruce guardado correctamente.");
    await cargarCruces(selectedId || undefined);
    setSaving(false);
  }

  async function eliminarCruce() {
    if (!selectedId) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar esta eliminatoria?"
    );

    if (!confirmar) return;

    setSaving(true);
    setMensaje("");

    const { error } = await supabase
      .from("final_matches")
      .delete()
      .eq("id", selectedId);

    if (error) {
      console.error("Error eliminando cruce:", error);
      setMensaje("No se ha podido eliminar el cruce.");
      setSaving(false);
      return;
    }

    setMensaje("Cruce eliminado correctamente.");
    setSelectedId("");
    await cargarCruces();
    setSaving(false);
  }

  function calcularClasificacionGeneral(
    teams: Team[],
    groupMatches: GroupMatch[]
  ) {
    const tabla: TableRow[] = teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      pj: 0,
      g: 0,
      e: 0,
      p: 0,
      gf: 0,
      gc: 0,
      dg: 0,
      pts: 0,
    }));

    groupMatches.forEach((match) => {
      if (match.home_score === null || match.away_score === null) return;

      const local = tabla.find((row) => row.teamId === match.home_team_id);
      const visitante = tabla.find(
        (row) => row.teamId === match.away_team_id
      );

      if (!local || !visitante) return;

      local.pj += 1;
      visitante.pj += 1;

      local.gf += match.home_score;
      local.gc += match.away_score;

      visitante.gf += match.away_score;
      visitante.gc += match.home_score;

      if (match.home_score > match.away_score) {
        local.g += 1;
        visitante.p += 1;
        local.pts += 3;
      } else if (match.home_score < match.away_score) {
        visitante.g += 1;
        local.p += 1;
        visitante.pts += 3;
      } else {
        local.e += 1;
        visitante.e += 1;
        local.pts += 1;
        visitante.pts += 1;
      }

      local.dg = local.gf - local.gc;
      visitante.dg = visitante.gf - visitante.gc;
    });

    return tabla.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      if (a.gc !== b.gc) return a.gc - b.gc;
      return a.teamName.localeCompare(b.teamName);
    });
  }

  function crearCruce(
    phaseName: string,
    titleName: string,
    homeRefName: string,
    awayRefName: string,
    order: number,
    matchDate: string | null,
    homeType: SourceType,
    awayType: SourceType,
    homeSourceTitle: string | null = null,
    awaySourceTitle: string | null = null
  ): NewFinalMatch {
    return {
      phase: phaseName,
      title: titleName,
      home_ref: homeRefName,
      away_ref: awayRefName,
      home_source_type: homeType,
      home_source_match_title: homeSourceTitle,
      away_source_type: awayType,
      away_source_match_title: awaySourceTitle,
      match_date: matchDate,
      match_time: null,
      field: null,
      home_score: null,
      away_score: null,
      home_penalties: null,
      away_penalties: null,
      status: "Pendiente",
      mvp_open: false,
      sort_order: order,
    };
  }

  async function generarEliminatoriasAutomaticas() {
    const confirmar = window.confirm(
      "Esto borrará las eliminatorias actuales y generará octavos, cuartos, semifinales, tercer puesto y final usando los 16 primeros de la clasificación general.\n\n¿Continuar?"
    );

    if (!confirmar) return;

    setGenerating(true);
    setMensaje("");

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("name", { ascending: true });

    if (teamsError) {
      console.error("Error cargando equipos:", teamsError);
      setMensaje("No se han podido cargar los equipos.");
      setGenerating(false);
      return;
    }

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, home_score, away_score");

    if (matchesError) {
      console.error("Error cargando partidos:", matchesError);
      setMensaje("No se han podido cargar los partidos.");
      setGenerating(false);
      return;
    }

    const teams = (teamsData ?? []) as Team[];
    const groupMatches = (matchesData ?? []) as GroupMatch[];

    const clasificacion = calcularClasificacionGeneral(teams, groupMatches);

    if (clasificacion.length < 16) {
      setMensaje(
        `Solo hay ${clasificacion.length} equipos. Necesitas al menos 16 para generar octavos.`
      );
      setGenerating(false);
      return;
    }

    const clasificados = clasificacion.slice(0, 16);
    const nuevosCruces: NewFinalMatch[] = [];

    OCTAVOS_PAIRS.forEach(([homePosition, awayPosition], index) => {
      const local = clasificados[homePosition - 1];
      const visitante = clasificados[awayPosition - 1];
      const titleName = `Octavo ${index + 1}`;

      nuevosCruces.push(
        crearCruce(
          "Octavos",
          titleName,
          local.teamName,
          visitante.teamName,
          nuevosCruces.length + 1,
          OCTAVOS_DATES[index] ?? null,
          "manual",
          "manual"
        )
      );
    });

    for (let i = 1; i <= 4; i++) {
      const octavoA = `Octavo ${i * 2 - 1}`;
      const octavoB = `Octavo ${i * 2}`;
      const titleName = `Cuarto ${i}`;

      nuevosCruces.push(
        crearCruce(
          "Cuartos",
          titleName,
          `Ganador ${octavoA}`,
          `Ganador ${octavoB}`,
          nuevosCruces.length + 1,
          CUARTOS_DATES[i - 1] ?? null,
          "winner",
          "winner",
          octavoA,
          octavoB
        )
      );
    }

    nuevosCruces.push(
      crearCruce(
        "Semifinales",
        "Semifinal 1",
        "Ganador Cuarto 1",
        "Ganador Cuarto 2",
        nuevosCruces.length + 1,
        SEMIS_DATES[0],
        "winner",
        "winner",
        "Cuarto 1",
        "Cuarto 2"
      )
    );

    nuevosCruces.push(
      crearCruce(
        "Semifinales",
        "Semifinal 2",
        "Ganador Cuarto 3",
        "Ganador Cuarto 4",
        nuevosCruces.length + 1,
        SEMIS_DATES[1],
        "winner",
        "winner",
        "Cuarto 3",
        "Cuarto 4"
      )
    );

    nuevosCruces.push(
      crearCruce(
        "Tercer puesto",
        "Tercer y cuarto puesto",
        "Perdedor Semifinal 1",
        "Perdedor Semifinal 2",
        nuevosCruces.length + 1,
        "2026-08-07",
        "loser",
        "loser",
        "Semifinal 1",
        "Semifinal 2"
      )
    );

    nuevosCruces.push(
      crearCruce(
        "Final",
        "Final",
        "Ganador Semifinal 1",
        "Ganador Semifinal 2",
        nuevosCruces.length + 1,
        "2026-08-07",
        "winner",
        "winner",
        "Semifinal 1",
        "Semifinal 2"
      )
    );

    const { error: deleteError } = await supabase
      .from("final_matches")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.error("Error borrando eliminatorias:", deleteError);
      setMensaje("No se han podido borrar las eliminatorias anteriores.");
      setGenerating(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("final_matches")
      .insert(nuevosCruces);

    if (insertError) {
      console.error("Error generando eliminatorias:", insertError);
      setMensaje("No se han podido generar las eliminatorias.");
      setGenerating(false);
      return;
    }

    setMensaje(
      "Eliminatorias generadas correctamente desde los 16 primeros clasificados."
    );
    setSelectedId("");
    await cargarCruces();
    setGenerating(false);
  }

  const opcionesCrucesFuente = matches.filter((match) => match.id !== selectedId);

  const mensajeCorrecto =
    mensaje.includes("correctamente") ||
    mensaje.includes("generadas") ||
    mensaje.includes("eliminado");

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
              Configurar eliminatorias
            </h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Octavos, cuartos, semifinales y final
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
              Cargando eliminatorias...
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <p className="text-sm font-black uppercase tracking-widest text-red-600">
                  Generación automática
                </p>

                <p className="mt-2 text-sm font-bold text-slate-600">
                  Genera octavos con los 16 primeros de la clasificación
                  general: 1º vs 16º, 8º vs 9º, 5º vs 12º, 4º vs 13º, 3º vs
                  14º, 6º vs 11º, 7º vs 10º y 2º vs 15º.
                </p>

                <button
                  onClick={generarEliminatoriasAutomaticas}
                  disabled={generating || saving}
                  className="mt-4 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:opacity-60"
                >
                  {generating
                    ? "Generando eliminatorias..."
                    : "Generar eliminatorias desde clasificación"}
                </button>
              </div>

              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <label className="text-sm font-black uppercase text-slate-500">
                  Eliminatoria existente
                </label>

                <select
                  value={selectedId}
                  onChange={(event) => {
                    const match = matches.find(
                      (item) => item.id === event.target.value
                    );

                    if (match) cargarEnFormulario(match);
                    if (!event.target.value) nuevoCruce();
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="">Nueva eliminatoria</option>

                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.sort_order}. {match.phase} · {match.title}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => nuevoCruce()}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                >
                  Crear nueva eliminatoria
                </button>
              </div>

              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Fase
                    </label>

                    <select
                      value={phase}
                      onChange={(event) => setPhase(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                    >
                      <option>Octavos</option>
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
                      onChange={(event) => setSortOrder(event.target.value)}
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
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Octavo 1, Cuarto 1, Semifinal 1, Final..."
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
                    onChange={(event) =>
                      setHomeSourceType(event.target.value as SourceType)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    <option value="manual">Manual</option>
                    <option value="winner">Ganador de eliminatoria</option>
                    <option value="loser">Perdedor de eliminatoria</option>
                  </select>

                  {(homeSourceType === "winner" ||
                    homeSourceType === "loser") && (
                    <select
                      value={homeSourceMatchTitle}
                      onChange={(event) =>
                        setHomeSourceMatchTitle(event.target.value)
                      }
                      className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                    >
                      <option value="">Elegir eliminatoria</option>

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
                      onChange={(event) => setHomeRef(event.target.value)}
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
                    onChange={(event) =>
                      setAwaySourceType(event.target.value as SourceType)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    <option value="manual">Manual</option>
                    <option value="winner">Ganador de eliminatoria</option>
                    <option value="loser">Perdedor de eliminatoria</option>
                  </select>

                  {(awaySourceType === "winner" ||
                    awaySourceType === "loser") && (
                    <select
                      value={awaySourceMatchTitle}
                      onChange={(event) =>
                        setAwaySourceMatchTitle(event.target.value)
                      }
                      className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                    >
                      <option value="">Elegir eliminatoria</option>

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
                      onChange={(event) => setAwayRef(event.target.value)}
                      placeholder="Equipo visitante"
                      className="mt-3 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    />
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Fecha
                    </label>

                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Hora
                    </label>

                    <input
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-black uppercase text-slate-500">
                    Campo
                  </label>

                  <input
                    value={field}
                    onChange={(event) => setField(event.target.value)}
                    placeholder="Campo"
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                  />
                </div>

                <button
                  onClick={guardarCruce}
                  disabled={saving || generating}
                  className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar eliminatoria"}
                </button>

                {selectedId && (
                  <button
                    onClick={eliminarCruce}
                    disabled={saving || generating}
                    className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-60"
                  >
                    Eliminar eliminatoria
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