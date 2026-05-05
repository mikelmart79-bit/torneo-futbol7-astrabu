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
  status: string | null;
  sort_order: number;
  mvp_open: boolean | null;
  home_source_type?: string | null;
  home_source_match_title?: string | null;
  away_source_type?: string | null;
  away_source_match_title?: string | null;
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

function numeroDesdeInput(valor: string) {
  return valor.trim() === "" ? null : Number.parseInt(valor, 10);
}

export default function AdminPartidosPage() {
  const [bloqueGruposAbierto, setBloqueGruposAbierto] = useState(false);
  const [bloqueFinalAbierto, setBloqueFinalAbierto] = useState(false);

  const [groups, setGroups] = useState<Group[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [finalMatches, setFinalMatches] = useState<FinalMatch[]>([]);

  const [grupoActivo, setGrupoActivo] = useState("");
  const [partidoId, setPartidoId] = useState("");
  const [golesLocal, setGolesLocal] = useState("");
  const [golesVisitante, setGolesVisitante] = useState("");
  const [estado, setEstado] = useState("Pendiente");
  const [mvpOpen, setMvpOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [finalPhase, setFinalPhase] = useState("Cuartos");
  const [finalSelectedId, setFinalSelectedId] = useState("");
  const [finalHomeScore, setFinalHomeScore] = useState("");
  const [finalAwayScore, setFinalAwayScore] = useState("");
  const [finalHomePenalties, setFinalHomePenalties] = useState("");
  const [finalAwayPenalties, setFinalAwayPenalties] = useState("");
  const [finalEstado, setFinalEstado] = useState("Pendiente");
  const [finalMvpOpen, setFinalMvpOpen] = useState(false);
  const [finalMensaje, setFinalMensaje] = useState("");

  const [loading, setLoading] = useState(true);

  const partidosGrupo = matches.filter(
    (match) => match.group_name === grupoActivo
  );

  const partido = partidosGrupo.find((match) => match.id === partidoId);

  const finalMatchesFase = finalMatches.filter(
    (match) => match.phase === finalPhase
  );

  const finalMatch = finalMatches.find(
    (match) => match.id === finalSelectedId
  );

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos(opciones?: {
    partidoMantenerId?: string;
    grupoMantener?: string;
    finalMantenerId?: string;
    faseMantener?: string;
  }) {
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
      opciones?.grupoMantener ||
      grupoActivo ||
      grupos[0]?.name ||
      partidos[0]?.group_name ||
      "";

    setGrupoActivo(grupoInicial);

    const partidoMantener = opciones?.partidoMantenerId
      ? partidos.find((match) => match.id === opciones.partidoMantenerId)
      : null;

    const primerPartido =
      partidoMantener ??
      partidos.find((match) => match.group_name === grupoInicial) ??
      null;

    if (primerPartido) {
      seleccionarPartido(primerPartido);
    } else {
      limpiarPartido();
    }

    const { data: finalData, error: finalError } = await supabase
      .from("final_matches")
      .select("*")
      .order("sort_order", { ascending: true });

    if (finalError) {
      setFinalMensaje("Error cargando eliminatorias.");
      setLoading(false);
      return;
    }

    const cruces = (finalData ?? []) as FinalMatch[];
    setFinalMatches(cruces);

    const faseInicial =
      opciones?.faseMantener || finalPhase || cruces[0]?.phase || "Cuartos";

    setFinalPhase(faseInicial);

    const finalMantener = opciones?.finalMantenerId
      ? cruces.find((match) => match.id === opciones.finalMantenerId)
      : null;

    const primerFinal =
      finalMantener ??
      cruces.find((match) => match.phase === faseInicial) ??
      null;

    if (primerFinal) {
      seleccionarFinal(primerFinal);
    } else {
      limpiarFinal();
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

  function validarResultadoGrupo() {
    if (!partido) {
      setMensaje("Selecciona un partido.");
      return false;
    }

    const local = numeroDesdeInput(golesLocal);
    const visitante = numeroDesdeInput(golesVisitante);

    if ((local === null && visitante !== null) || (local !== null && visitante === null)) {
      setMensaje("Indica los goles de los dos equipos o deja ambos vacíos.");
      return false;
    }

    if (local !== null && local < 0) {
      setMensaje("Los goles del equipo local no pueden ser negativos.");
      return false;
    }

    if (visitante !== null && visitante < 0) {
      setMensaje("Los goles del equipo visitante no pueden ser negativos.");
      return false;
    }

    return true;
  }

  async function guardarResultadoGrupo() {
    if (!validarResultadoGrupo() || !partido) return;

    const local = numeroDesdeInput(golesLocal);
    const visitante = numeroDesdeInput(golesVisitante);

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

    await cargarDatos({
      partidoMantenerId: partido.id,
      grupoMantener: grupoActivo,
      finalMantenerId: finalSelectedId,
      faseMantener: finalPhase,
    });
  }

  function seleccionarFinal(match: FinalMatch) {
    setFinalSelectedId(match.id);
    setFinalPhase(match.phase);
    setFinalHomeScore(match.home_score?.toString() ?? "");
    setFinalAwayScore(match.away_score?.toString() ?? "");
    setFinalHomePenalties(match.home_penalties?.toString() ?? "");
    setFinalAwayPenalties(match.away_penalties?.toString() ?? "");
    setFinalEstado(match.status ?? "Pendiente");
    setFinalMvpOpen(Boolean(match.mvp_open));
    setFinalMensaje("");
  }

  function limpiarFinal() {
    setFinalSelectedId("");
    setFinalHomeScore("");
    setFinalAwayScore("");
    setFinalHomePenalties("");
    setFinalAwayPenalties("");
    setFinalEstado("Pendiente");
    setFinalMvpOpen(false);
  }

  function cambiarFaseFinal(fase: string) {
    setFinalPhase(fase);

    const primerCruce = finalMatches.find((match) => match.phase === fase);

    if (primerCruce) {
      seleccionarFinal(primerCruce);
    } else {
      limpiarFinal();
    }
  }

  function cambiarFinal(id: string) {
    const nuevoFinal = finalMatches.find((match) => match.id === id);
    if (!nuevoFinal) return;
    seleccionarFinal(nuevoFinal);
  }

  function validarResultadoFinal() {
    if (!finalMatch) {
      setFinalMensaje("Selecciona una eliminatoria.");
      return false;
    }

    const local = numeroDesdeInput(finalHomeScore);
    const visitante = numeroDesdeInput(finalAwayScore);
    const penLocal = numeroDesdeInput(finalHomePenalties);
    const penVisitante = numeroDesdeInput(finalAwayPenalties);

    if ((local === null && visitante !== null) || (local !== null && visitante === null)) {
      setFinalMensaje("Indica los goles de los dos equipos o deja ambos vacíos.");
      return false;
    }

    if (local !== null && local < 0) {
      setFinalMensaje("Los goles del equipo local no pueden ser negativos.");
      return false;
    }

    if (visitante !== null && visitante < 0) {
      setFinalMensaje("Los goles del equipo visitante no pueden ser negativos.");
      return false;
    }

    if ((local === null || visitante === null) && (penLocal !== null || penVisitante !== null)) {
      setFinalMensaje("Solo puedes indicar penaltis cuando hay resultado.");
      return false;
    }

    if (local !== null && visitante !== null && local !== visitante && (penLocal !== null || penVisitante !== null)) {
      setFinalMensaje("Solo debe haber penaltis si el partido acaba empatado.");
      return false;
    }

    if (local !== null && visitante !== null && local === visitante) {
      if ((penLocal === null && penVisitante !== null) || (penLocal !== null && penVisitante === null)) {
        setFinalMensaje("Si hay penaltis, indica los penaltis de los dos equipos.");
        return false;
      }

      if (penLocal !== null && penVisitante !== null && penLocal === penVisitante) {
        setFinalMensaje("Los penaltis no pueden quedar empatados.");
        return false;
      }

      if (penLocal !== null && penLocal < 0) {
        setFinalMensaje("Los penaltis del equipo local no pueden ser negativos.");
        return false;
      }

      if (penVisitante !== null && penVisitante < 0) {
        setFinalMensaje("Los penaltis del equipo visitante no pueden ser negativos.");
        return false;
      }
    }

    return true;
  }

  async function actualizarArrastresFinales() {
    const { data, error } = await supabase
      .from("final_matches")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      setFinalMensaje(
        "Guardado, pero no se han podido actualizar los cruces siguientes."
      );
      return;
    }

    let lista = (data ?? []) as FinalMatch[];

    function resolver(
      matchTitle: string | null | undefined,
      tipo: "winner" | "loser"
    ) {
      if (!matchTitle) return "";

      const origen = lista.find((match) => match.title === matchTitle);

      if (!origen) {
        return `${tipo === "winner" ? "Ganador" : "Perdedor"} ${matchTitle}`;
      }

      if (origen.home_score === null || origen.away_score === null) {
        return `${tipo === "winner" ? "Ganador" : "Perdedor"} ${matchTitle}`;
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

      if (ganaLocal === null) {
        return `${tipo === "winner" ? "Ganador" : "Perdedor"} ${matchTitle}`;
      }

      if (tipo === "winner") {
        return ganaLocal ? origen.home_ref : origen.away_ref;
      }

      return ganaLocal ? origen.away_ref : origen.home_ref;
    }

    for (let vuelta = 0; vuelta < 5; vuelta++) {
      lista = lista.map((match) => ({
        ...match,
        home_ref:
          match.home_source_type === "winner"
            ? resolver(match.home_source_match_title, "winner")
            : match.home_source_type === "loser"
              ? resolver(match.home_source_match_title, "loser")
              : match.home_ref,
        away_ref:
          match.away_source_type === "winner"
            ? resolver(match.away_source_match_title, "winner")
            : match.away_source_type === "loser"
              ? resolver(match.away_source_match_title, "loser")
              : match.away_ref,
      }));
    }

    for (const match of lista) {
      const { error: updateError } = await supabase
        .from("final_matches")
        .update({
          home_ref: match.home_ref,
          away_ref: match.away_ref,
        })
        .eq("id", match.id);

      if (updateError) {
        setFinalMensaje(
          "Guardado, pero no se han podido actualizar todos los cruces siguientes."
        );
        return;
      }
    }
  }

  async function guardarResultadoFinal() {
    if (!validarResultadoFinal() || !finalMatch) return;

    const local = numeroDesdeInput(finalHomeScore);
    const visitante = numeroDesdeInput(finalAwayScore);
    const penLocal = numeroDesdeInput(finalHomePenalties);
    const penVisitante = numeroDesdeInput(finalAwayPenalties);

    const { error } = await supabase
      .from("final_matches")
      .update({
        home_score: local,
        away_score: visitante,
        home_penalties: penLocal,
        away_penalties: penVisitante,
        status: finalEstado,
        mvp_open: finalMvpOpen,
      })
      .eq("id", finalMatch.id);

    if (error) {
      console.error("Error guardando eliminatoria:", error);
      setFinalMensaje("No se ha podido guardar la eliminatoria.");
      return;
    }

    await actualizarArrastresFinales();

    setFinalMensaje(
      `Eliminatoria guardada: ${finalMatch.home_ref} ${local ?? "-"} - ${
        visitante ?? "-"
      } ${finalMatch.away_ref}`
    );

    await cargarDatos({
      partidoMantenerId: partidoId,
      grupoMantener: grupoActivo,
      finalMantenerId: finalMatch.id,
      faseMantener: finalPhase,
    });
  }

  const mensajeCorrecto = mensaje.includes("guardado");
  const finalMensajeCorrecto = finalMensaje.includes("guardada");

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
              Marcadores de grupos y eliminatorias
            </p>
          </div>

          {loading ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Cargando partidos...
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
                <button
                  onClick={() => setBloqueGruposAbierto(!bloqueGruposAbierto)}
                  className="flex w-full items-center justify-between bg-red-600 px-5 py-4 text-left text-white"
                >
                  <div>
                    <p className="text-lg font-black">Fase de grupos</p>
                    <p className="text-sm font-bold opacity-90">
                      Marcadores de partidos de grupo
                    </p>
                  </div>

                  <span className="text-3xl font-black">
                    {bloqueGruposAbierto ? "−" : "+"}
                  </span>
                </button>

                {bloqueGruposAbierto && (
                  <div className="space-y-5 p-5">
                    {groups.length === 0 ? (
                      <p className="rounded-2xl bg-slate-100 p-4 font-bold text-slate-500">
                        Todavía no hay grupos creados.
                      </p>
                    ) : (
                      <>
                        <div>
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
                        </div>

                        <div>
                          <label className="text-sm font-black uppercase text-slate-500">
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
                        </div>

                        {partido ? (
                          <>
                            <div className="rounded-2xl bg-slate-100 p-4">
                              <p className="text-sm font-black text-red-600">
                                {partido.group_name}
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-500">
                                {formatearFechaSegura(partido.match_date)} ·{" "}
                                {partido.match_time ?? "Hora pendiente"} ·{" "}
                                {partido.field ?? "Campo pendiente"}
                              </p>
                            </div>

                            <div className="space-y-3">
                              <div className="grid grid-cols-[1fr_82px] items-center gap-3 rounded-2xl bg-slate-50 p-3">
                                <p className="break-words font-black leading-tight">
                                  {partido.home_team?.name ?? "Local"}
                                </p>
                                <input
                                  type="number"
                                  min="0"
                                  value={golesLocal}
                                  onChange={(event) =>
                                    setGolesLocal(event.target.value)
                                  }
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

                            <div>
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

                            <label className="flex items-center justify-between rounded-2xl bg-slate-100 p-4 font-black">
                              <span>Abrir votación MVP</span>
                              <input
                                type="checkbox"
                                checked={mvpOpen}
                                onChange={(event) =>
                                  setMvpOpen(event.target.checked)
                                }
                                className="h-6 w-6"
                              />
                            </label>

                            <button
                              onClick={guardarResultadoGrupo}
                              className="w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                            >
                              Guardar resultado
                            </button>

                            {mensaje && (
                              <div
                                className={`rounded-xl p-3 text-sm font-bold ${
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
                          <p className="rounded-2xl bg-slate-100 p-4 font-bold text-slate-500">
                            No hay partidos cargados en este grupo.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
                <button
                  onClick={() => setBloqueFinalAbierto(!bloqueFinalAbierto)}
                  className="flex w-full items-center justify-between bg-slate-950 px-5 py-4 text-left text-white"
                >
                  <div>
                    <p className="text-lg font-black">Eliminatorias</p>
                    <p className="text-sm font-bold opacity-80">
                      Marcadores, penaltis y MVP
                    </p>
                  </div>

                  <span className="text-3xl font-black">
                    {bloqueFinalAbierto ? "−" : "+"}
                  </span>
                </button>

                {bloqueFinalAbierto && (
                  <div className="space-y-5 p-5">
                    {finalMatches.length === 0 ? (
                      <p className="rounded-2xl bg-slate-100 p-4 font-bold text-slate-500">
                        Todavía no hay eliminatorias configuradas.
                      </p>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm font-black uppercase text-slate-500">
                            Fase
                          </label>

                          <select
                            value={finalPhase}
                            onChange={(event) => cambiarFaseFinal(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                          >
                            <option>Cuartos</option>
                            <option>Semifinales</option>
                            <option>Tercer puesto</option>
                            <option>Final</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-black uppercase text-slate-500">
                            Eliminatoria
                          </label>

                          <select
                            value={finalSelectedId}
                            onChange={(event) => cambiarFinal(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                          >
                            {finalMatchesFase.length === 0 ? (
                              <option value="">No hay cruces en esta fase</option>
                            ) : (
                              finalMatchesFase.map((match) => (
                                <option key={match.id} value={match.id}>
                                  {match.title} · {match.home_ref} vs{" "}
                                  {match.away_ref}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        {finalMatch ? (
                          <>
                            <div className="rounded-2xl bg-slate-100 p-4">
                              <p className="text-sm font-black text-red-600">
                                {finalMatch.phase} · {finalMatch.title}
                              </p>

                              <p className="mt-2 break-words text-xl font-black leading-tight">
                                {finalMatch.home_ref} vs {finalMatch.away_ref}
                              </p>

                              <p className="mt-2 text-sm font-bold text-slate-500">
                                {formatearFechaSegura(finalMatch.match_date)} ·{" "}
                                {finalMatch.match_time ?? "Hora pendiente"} ·{" "}
                                {finalMatch.field ?? "Campo pendiente"}
                              </p>
                            </div>

                            <div className="space-y-3">
                              <div className="grid grid-cols-[1fr_82px] items-center gap-3 rounded-2xl bg-slate-50 p-3">
                                <p className="break-words font-black leading-tight">
                                  {finalMatch.home_ref}
                                </p>
                                <input
                                  type="number"
                                  min="0"
                                  value={finalHomeScore}
                                  onChange={(event) =>
                                    setFinalHomeScore(event.target.value)
                                  }
                                  className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                                />
                              </div>

                              <div className="grid grid-cols-[1fr_82px] items-center gap-3 rounded-2xl bg-slate-50 p-3">
                                <p className="break-words font-black leading-tight">
                                  {finalMatch.away_ref}
                                </p>
                                <input
                                  type="number"
                                  min="0"
                                  value={finalAwayScore}
                                  onChange={(event) =>
                                    setFinalAwayScore(event.target.value)
                                  }
                                  className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                                />
                              </div>
                            </div>

                            <div className="rounded-2xl bg-slate-100 p-4">
                              <p className="text-sm font-black uppercase text-slate-500">
                                Penaltis si hay empate
                              </p>

                              <div className="mt-3 grid grid-cols-2 gap-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={finalHomePenalties}
                                  onChange={(event) =>
                                    setFinalHomePenalties(event.target.value)
                                  }
                                  placeholder="Pen. local"
                                  className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                                />

                                <input
                                  type="number"
                                  min="0"
                                  value={finalAwayPenalties}
                                  onChange={(event) =>
                                    setFinalAwayPenalties(event.target.value)
                                  }
                                  placeholder="Pen. visitante"
                                  className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-black uppercase text-slate-500">
                                Estado
                              </label>
                              <select
                                value={finalEstado}
                                onChange={(event) =>
                                  setFinalEstado(event.target.value)
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                              >
                                <option>Pendiente</option>
                                <option>En juego</option>
                                <option>Finalizado</option>
                                <option>Cerrado</option>
                              </select>
                            </div>

                            <label className="flex items-center justify-between rounded-2xl bg-slate-100 p-4 font-black">
                              <span>Abrir votación MVP</span>
                              <input
                                type="checkbox"
                                checked={finalMvpOpen}
                                onChange={(event) =>
                                  setFinalMvpOpen(event.target.checked)
                                }
                                className="h-6 w-6"
                              />
                            </label>

                            <button
                              onClick={guardarResultadoFinal}
                              className="w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                            >
                              Guardar eliminatoria
                            </button>

                            {finalMensaje && (
                              <div
                                className={`rounded-xl p-3 text-sm font-bold ${
                                  finalMensajeCorrecto
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {finalMensaje}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="rounded-2xl bg-slate-100 p-4 font-bold text-slate-500">
                            No hay eliminatorias en esta fase.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}