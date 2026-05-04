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
  home_score: number | null;
  away_score: number | null;
  status: string;
  sort_order: number;
};

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

type GroupMatch = {
  id: string;
  group_name: string | null;
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [phase, setPhase] = useState("Cuartos");
  const [title, setTitle] = useState("");

  const [homeSourceType, setHomeSourceType] = useState<SourceType>("group_position");
  const [homeRef, setHomeRef] = useState("");
  const [homePosition, setHomePosition] = useState("1");
  const [homeGroup, setHomeGroup] = useState("");
  const [homeSourceMatchTitle, setHomeSourceMatchTitle] = useState("");

  const [awaySourceType, setAwaySourceType] = useState<SourceType>("group_position");
  const [awayRef, setAwayRef] = useState("");
  const [awayPosition, setAwayPosition] = useState("2");
  const [awayGroup, setAwayGroup] = useState("");
  const [awaySourceMatchTitle, setAwaySourceMatchTitle] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [field, setField] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [status, setStatus] = useState("Pendiente");
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
    await Promise.all([cargarCruces(), cargarEquiposYPartidos()]);
  }

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

  async function cargarEquiposYPartidos() {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("group_name", { ascending: true })
      .order("name", { ascending: true });

    const { data: matchesData } = await supabase
      .from("matches")
      .select(
        "id, group_name, home_team_id, away_team_id, home_score, away_score"
      );

    setTeams((teamsData ?? []) as Team[]);
    setGroupMatches((matchesData ?? []) as GroupMatch[]);
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
    setHomeScore("");
    setAwayScore("");
    setStatus("Pendiente");
    setSortOrder((matches.length + 1).toString());
    setMensaje("");
  }

  function calcularClasificacion(grupo: string) {
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

  function labelPosicion(posicion: string | number | null, grupo: string | null) {
    if (!posicion || !grupo) return "";
    return `${posicion}º ${grupo}`;
  }

  function resolverEquipoGrupo(posicion: string | number | null, grupo: string | null) {
    if (!posicion || !grupo) return "";

    const tabla = calcularClasificacion(grupo);
    const equipo = tabla[Number(posicion) - 1];

    return equipo?.teamName ?? labelPosicion(posicion, grupo);
  }

  function resolverGanadorPerdedor(
    sourceMatchTitle: string | null,
    tipo: "winner" | "loser",
    lista: FinalMatch[]
  ) {
    if (!sourceMatchTitle) return "";

    const source = lista.find((match) => match.title === sourceMatchTitle);

    if (!source) return `${tipo === "winner" ? "Ganador" : "Perdedor"} ${sourceMatchTitle}`;

    if (source.home_score === null || source.away_score === null) {
      return `${tipo === "winner" ? "Ganador" : "Perdedor"} ${sourceMatchTitle}`;
    }

    if (source.home_score === source.away_score) {
      return `${tipo === "winner" ? "Ganador" : "Perdedor"} ${sourceMatchTitle}`;
    }

    const ganaLocal = source.home_score > source.away_score;

    if (tipo === "winner") {
      return ganaLocal ? source.home_ref : source.away_ref;
    }

    return ganaLocal ? source.away_ref : source.home_ref;
  }

  function resolverReferenciaLado(
    tipo: SourceType | null,
    posicion: number | null,
    grupo: string | null,
    sourceMatchTitle: string | null,
    manualRef: string,
    lista: FinalMatch[]
  ) {
    if (tipo === "group_position") {
      return resolverEquipoGrupo(posicion, grupo);
    }

    if (tipo === "winner") {
      return resolverGanadorPerdedor(sourceMatchTitle, "winner", lista);
    }

    if (tipo === "loser") {
      return resolverGanadorPerdedor(sourceMatchTitle, "loser", lista);
    }

    return manualRef;
  }

  function referenciaPreviaLado(
    tipo: SourceType,
    posicion: string,
    grupo: string,
    sourceMatchTitle: string,
    manualRef: string
  ) {
    if (tipo === "group_position") return labelPosicion(posicion, grupo);
    if (tipo === "winner") return sourceMatchTitle ? `Ganador ${sourceMatchTitle}` : "";
    if (tipo === "loser") return sourceMatchTitle ? `Perdedor ${sourceMatchTitle}` : "";
    return manualRef;
  }

  async function guardarCruce() {
    const payload = {
      phase,
      title,
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

  async function actualizarEquiposDesdeFuentes() {
    const { data, error } = await supabase
      .from("final_matches")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      setMensaje("No se han podido cargar los cruces.");
      return;
    }

    let lista = (data ?? []) as FinalMatch[];

    for (let vuelta = 0; vuelta < 5; vuelta++) {
      lista = lista.map((match) => ({
        ...match,
        home_ref: resolverReferenciaLado(
          match.home_source_type,
          match.home_position,
          match.home_group,
          match.home_source_match_title,
          match.home_ref,
          lista
        ),
        away_ref: resolverReferenciaLado(
          match.away_source_type,
          match.away_position,
          match.away_group,
          match.away_source_match_title,
          match.away_ref,
          lista
        ),
      }));
    }

    for (const match of lista) {
      await supabase
        .from("final_matches")
        .update({
          home_ref: match.home_ref,
          away_ref: match.away_ref,
        })
        .eq("id", match.id);
    }

    setMatches(lista);
    setMensaje("Equipos actualizados desde clasificación y resultados.");
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

          <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            <button
              onClick={actualizarEquiposDesdeFuentes}
              className="w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
            >
              Actualizar equipos desde clasificación/resultados
            </button>

            <p className="mt-3 text-xs font-bold text-slate-500">
              Primero puedes definir los cruces como referencias. Cuando acaben
              los grupos o una eliminatoria, pulsa aquí y la app colocará los
              equipos en su sitio.
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
                onChange={(e) => setHomeSourceType(e.target.value as SourceType)}
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

              {(homeSourceType === "winner" || homeSourceType === "loser") && (
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
                onChange={(e) => setAwaySourceType(e.target.value as SourceType)}
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

              {(awaySourceType === "winner" || awaySourceType === "loser") && (
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

            <div className="mt-4 grid grid-cols-2 gap-3">
              <input
                type="number"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="Goles local"
                className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
              />

              <input
                type="number"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="Goles visitante"
                className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
            >
              <option>Pendiente</option>
              <option>En juego</option>
              <option>Finalizado</option>
              <option>Cerrado</option>
            </select>

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