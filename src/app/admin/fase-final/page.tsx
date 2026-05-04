"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

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
  status: string;
  sort_order: number;
};

type Team = {
  id: string;
  name: string;
  group_name: string;
};

type GroupMatch = {
  id: string;
  group_name: string;
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

export default function AdminFaseFinalPage() {
  const [matches, setMatches] = useState<FinalMatch[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [phase, setPhase] = useState("Cuartos");
  const [title, setTitle] = useState("");
  const [homeRef, setHomeRef] = useState("");
  const [awayRef, setAwayRef] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [field, setField] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [status, setStatus] = useState("Pendiente");
  const [sortOrder, setSortOrder] = useState("1");

  useEffect(() => {
    cargarCruces();
  }, []);

  async function cargarCruces() {
    const { data } = await supabase
      .from("final_matches")
      .select("*")
      .order("sort_order", { ascending: true });

    const rows = (data ?? []) as FinalMatch[];
    setMatches(rows);

    if (rows.length > 0 && !selectedId) {
      cargarEnFormulario(rows[0]);
    }
  }

  function cargarEnFormulario(match: FinalMatch) {
    setSelectedId(match.id);
    setPhase(match.phase);
    setTitle(match.title);
    setHomeRef(match.home_ref);
    setAwayRef(match.away_ref);
    setDate(match.match_date ?? "");
    setTime(match.match_time ?? "");
    setField(match.field ?? "");
    setHomeScore(match.home_score?.toString() ?? "");
    setAwayScore(match.away_score?.toString() ?? "");
    setStatus(match.status);
    setSortOrder(match.sort_order.toString());
    setMensaje("");
  }

  function nuevoCruce() {
    setSelectedId("");
    setPhase("Cuartos");
    setTitle("");
    setHomeRef("");
    setAwayRef("");
    setDate("");
    setTime("");
    setField("");
    setHomeScore("");
    setAwayScore("");
    setStatus("Pendiente");
    setSortOrder((matches.length + 1).toString());
    setMensaje("");
  }

  async function guardarCruce() {
    const payload = {
      phase,
      title,
      home_ref: homeRef,
      away_ref: awayRef,
      match_date: date || null,
      match_time: time || null,
      field: field || null,
      home_score: homeScore === "" ? null : Number(homeScore),
      away_score: awayScore === "" ? null : Number(awayScore),
      status,
      sort_order: Number(sortOrder) || 1,
    };

    const { error } = selectedId
      ? await supabase.from("final_matches").update(payload).eq("id", selectedId)
      : await supabase.from("final_matches").insert(payload);

    if (error) {
      setMensaje("No se ha podido guardar el cruce.");
      return;
    }

    setMensaje("Cruce guardado correctamente.");
    await cargarCruces();
  }

  async function eliminarCruce() {
    if (!selectedId) return;

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

  function calcularClasificacion(
    grupo: string,
    teams: Team[],
    groupMatches: GroupMatch[]
  ) {
    const equiposGrupo = teams.filter((team) => team.group_name === grupo);

    const tabla: TableRow[] = equiposGrupo.map((team) => ({
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

    const partidosGrupo = groupMatches.filter(
      (match) => match.group_name === grupo
    );

    partidosGrupo.forEach((match) => {
      if (match.home_score === null || match.away_score === null) return;

      const local = tabla.find((row) => row.teamId === match.home_team_id);
      const visitante = tabla.find((row) => row.teamId === match.away_team_id);

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
      return a.teamName.localeCompare(b.teamName);
    });
  }

  async function generarEliminatoriasAutomaticas() {
    const confirmar = window.confirm(
      "Esto borrará los cruces actuales de fase final y generará nuevos cruces desde la clasificación. ¿Continuar?"
    );

    if (!confirmar) return;

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name");

    if (teamsError) {
      setMensaje("No se han podido cargar los equipos.");
      return;
    }

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select("id, group_name, home_team_id, away_team_id, home_score, away_score");

    if (matchesError) {
      setMensaje("No se han podido cargar los partidos.");
      return;
    }

    const teams = (teamsData ?? []) as Team[];
    const groupMatches = (matchesData ?? []) as GroupMatch[];

    const grupos = ["Grupo A", "Grupo B", "Grupo C", "Grupo D"];

    const clasificados: Record<string, TableRow[]> = {};

    for (const grupo of grupos) {
      const tabla = calcularClasificacion(grupo, teams, groupMatches);
      clasificados[grupo] = tabla;

      if (tabla.length < 2) {
        setMensaje(`Faltan equipos clasificados en ${grupo}.`);
        return;
      }
    }

    const nuevosCruces = [
      {
        phase: "Cuartos",
        title: "Cuarto 1",
        home_ref: clasificados["Grupo A"][0].teamName,
        away_ref: clasificados["Grupo B"][1].teamName,
        match_date: null,
        match_time: null,
        field: null,
        home_score: null,
        away_score: null,
        status: "Pendiente",
        sort_order: 1,
      },
      {
        phase: "Cuartos",
        title: "Cuarto 2",
        home_ref: clasificados["Grupo B"][0].teamName,
        away_ref: clasificados["Grupo A"][1].teamName,
        match_date: null,
        match_time: null,
        field: null,
        home_score: null,
        away_score: null,
        status: "Pendiente",
        sort_order: 2,
      },
      {
        phase: "Cuartos",
        title: "Cuarto 3",
        home_ref: clasificados["Grupo C"][0].teamName,
        away_ref: clasificados["Grupo D"][1].teamName,
        match_date: null,
        match_time: null,
        field: null,
        home_score: null,
        away_score: null,
        status: "Pendiente",
        sort_order: 3,
      },
      {
        phase: "Cuartos",
        title: "Cuarto 4",
        home_ref: clasificados["Grupo D"][0].teamName,
        away_ref: clasificados["Grupo C"][1].teamName,
        match_date: null,
        match_time: null,
        field: null,
        home_score: null,
        away_score: null,
        status: "Pendiente",
        sort_order: 4,
      },
      {
        phase: "Semifinales",
        title: "Semifinal 1",
        home_ref: "Ganador Cuarto 1",
        away_ref: "Ganador Cuarto 2",
        match_date: null,
        match_time: null,
        field: null,
        home_score: null,
        away_score: null,
        status: "Pendiente",
        sort_order: 5,
      },
      {
        phase: "Semifinales",
        title: "Semifinal 2",
        home_ref: "Ganador Cuarto 3",
        away_ref: "Ganador Cuarto 4",
        match_date: null,
        match_time: null,
        field: null,
        home_score: null,
        away_score: null,
        status: "Pendiente",
        sort_order: 6,
      },
      {
        phase: "Tercer puesto",
        title: "Tercer y cuarto puesto",
        home_ref: "Perdedor Semifinal 1",
        away_ref: "Perdedor Semifinal 2",
        match_date: null,
        match_time: null,
        field: null,
        home_score: null,
        away_score: null,
        status: "Pendiente",
        sort_order: 7,
      },
      {
        phase: "Final",
        title: "Final",
        home_ref: "Ganador Semifinal 1",
        away_ref: "Ganador Semifinal 2",
        match_date: null,
        match_time: null,
        field: null,
        home_score: null,
        away_score: null,
        status: "Pendiente",
        sort_order: 8,
      },
    ];

    const { error: deleteError } = await supabase
      .from("final_matches")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      setMensaje("No se han podido borrar los cruces anteriores.");
      return;
    }

    const { error: insertError } = await supabase
      .from("final_matches")
      .insert(nuevosCruces);

    if (insertError) {
      setMensaje("No se han podido generar las eliminatorias.");
      return;
    }

    setMensaje("Eliminatorias generadas automáticamente.");
    setSelectedId("");
    await cargarCruces();
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
              Fase final
            </h1>
          </div>

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            <button
              onClick={generarEliminatoriasAutomaticas}
              className="w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
            >
              Generar eliminatorias automáticamente
            </button>

            <p className="mt-3 text-xs font-bold text-slate-500">
              Usa la clasificación actual de los grupos. Borra los cruces
              existentes y crea cuartos, semifinales, tercer puesto y final.
            </p>
          </div>

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
                placeholder="Cuarto 1, Semifinal 1, Gran final..."
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
              />
            </div>

            <div className="mt-4">
              <label className="text-xs font-black uppercase text-slate-500">
                Local / referencia
              </label>
              <input
                value={homeRef}
                onChange={(e) => setHomeRef(e.target.value)}
                placeholder="1º Grupo A"
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
              />
            </div>

            <div className="mt-4">
              <label className="text-xs font-black uppercase text-slate-500">
                Visitante / referencia
              </label>
              <input
                value={awayRef}
                onChange={(e) => setAwayRef(e.target.value)}
                placeholder="2º Grupo B"
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase text-slate-500">
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
                  onChange={(e) => setTime(e.target.value)}
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
                onChange={(e) => setField(e.target.value)}
                placeholder="Campo 1"
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase text-slate-500">
                  Goles local
                </label>
                <input
                  type="number"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-500">
                  Goles visitante
                </label>
                <input
                  type="number"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-black uppercase text-slate-500">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
              >
                <option>Pendiente</option>
                <option>En juego</option>
                <option>Finalizado</option>
                <option>Cerrado</option>
              </select>
            </div>

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
              <div className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm font-bold text-emerald-800">
                {mensaje}
              </div>
            )}
          </div>
        </section>
      </main>
    </AdminGuard>
  );
}