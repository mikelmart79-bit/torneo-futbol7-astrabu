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

export default function AdminGestionarPartidosPage() {
  const [bloqueGruposAbierto, setBloqueGruposAbierto] = useState(true);
  const [bloqueFinalAbierto, setBloqueFinalAbierto] = useState(false);

  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [finalMatches, setFinalMatches] = useState<FinalMatch[]>([]);

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

  const [finalSelectedId, setFinalSelectedId] = useState("");
  const [finalPhase, setFinalPhase] = useState("Cuartos");
  const [finalFecha, setFinalFecha] = useState("");
  const [finalHora, setFinalHora] = useState("");
  const [finalCampo, setFinalCampo] = useState("Campo 1");
  const [finalEstado, setFinalEstado] = useState("Pendiente");
  const [finalHomeScore, setFinalHomeScore] = useState("");
  const [finalAwayScore, setFinalAwayScore] = useState("");
  const [finalHomePenalties, setFinalHomePenalties] = useState("");
  const [finalAwayPenalties, setFinalAwayPenalties] = useState("");
  const [finalMvpOpen, setFinalMvpOpen] = useState(false);
  const [finalMensaje, setFinalMensaje] = useState("");

  const [loading, setLoading] = useState(true);

  const teamsGrupo = teams.filter((team) => team.group_name === grupo);
  const matchesGrupo = matches.filter((match) => match.group_name === grupo);
  const finalMatchesFase = finalMatches.filter(
    (match) => match.phase === finalPhase
  );

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
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

    const grupoActivo = grupo || grupos[0]?.name || "";
    setGrupo(grupoActivo);

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("group_name", { ascending: true })
      .order("name", { ascending: true });

    if (teamsError) {
      setMensaje("Error cargando equipos.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

    const equiposGrupoInicial = equipos.filter(
      (team) => team.group_name === grupoActivo
    );

    if (!homeTeamId || !equiposGrupoInicial.some((team) => team.id === homeTeamId)) {
      setHomeTeamId(equiposGrupoInicial[0]?.id ?? "");
    }

    if (!awayTeamId || !equiposGrupoInicial.some((team) => team.id === awayTeamId)) {
      setAwayTeamId(equiposGrupoInicial[1]?.id ?? "");
    }

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
      setMensaje("Error cargando partidos de grupos.");
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

    const { data: finalData, error: finalError } = await supabase
      .from("final_matches")
      .select("*")
      .order("sort_order", { ascending: true });

    if (finalError) {
      setFinalMensaje("Error cargando eliminatorias.");
      setLoading(false);
      return;
    }

    setFinalMatches((finalData ?? []) as FinalMatch[]);
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
    setGrupo(match.group_name ?? "");
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
      limpiarFormulario();
      return;
    }

    const match = matches.find((item) => item.id === id);
    if (match) cargarPartido(match);
  }

  function validarPartidoGrupo() {
    if (!grupo) {
      setMensaje("Selecciona un grupo.");
      return false;
    }

    if (!homeTeamId || !awayTeamId) {
      setMensaje("Selecciona los dos equipos.");
      return false;
    }

    if (homeTeamId === awayTeamId) {
      setMensaje("El equipo local y visitante no pueden ser el mismo.");
      return false;
    }

    const local = teams.find((team) => team.id === homeTeamId);
    const visitante = teams.find((team) => team.id === awayTeamId);

    if (local?.group_name !== grupo || visitante?.group_name !== grupo) {
      setMensaje("Los dos equipos deben pertenecer al grupo seleccionado.");
      return false;
    }

    if (!fecha || !hora) {
      setMensaje("Indica fecha y hora del partido.");
      return false;
    }

    return true;
  }

  async function guardarPartido() {
    if (!validarPartidoGrupo()) return;

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
      "¿Seguro que quieres eliminar este partido? También se borrarán sus votos MVP si los hubiera."
    );

    if (!confirmar) return;

    await supabase.from("mvp_votes").delete().eq("match_id", selectedId);

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

  function limpiarFinalFormulario() {
    setFinalSelectedId("");
    setFinalFecha("");
    setFinalHora("");
    setFinalCampo("Campo 1");
    setFinalEstado("Pendiente");
    setFinalHomeScore("");
    setFinalAwayScore("");
    setFinalHomePenalties("");
    setFinalAwayPenalties("");
    setFinalMvpOpen(false);
    setFinalMensaje("");
  }

  function cargarFinalMatch(match: FinalMatch) {
    setFinalSelectedId(match.id);
    setFinalPhase(match.phase);
    setFinalFecha(match.match_date ?? "");
    setFinalHora(match.match_time ?? "");
    setFinalCampo(match.field ?? "Campo 1");
    setFinalEstado(match.status ?? "Pendiente");
    setFinalHomeScore(match.home_score?.toString() ?? "");
    setFinalAwayScore(match.away_score?.toString() ?? "");
    setFinalHomePenalties(match.home_penalties?.toString() ?? "");
    setFinalAwayPenalties(match.away_penalties?.toString() ?? "");
    setFinalMvpOpen(Boolean(match.mvp_open));
    setFinalMensaje("");
  }

  function cambiarFinalMatch(id: string) {
    if (!id) {
      limpiarFinalFormulario();
      return;
    }

    const match = finalMatches.find((item) => item.id === id);
    if (match) cargarFinalMatch(match);
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

  function validarFinal() {
    if (!finalSelectedId) {
      setFinalMensaje("Selecciona un cruce de eliminatorias.");
      return false;
    }

    if (!finalFecha || !finalHora) {
      setFinalMensaje("Indica fecha y hora del partido.");
      return false;
    }

    const homeScore = finalHomeScore === "" ? null : Number(finalHomeScore);
    const awayScore = finalAwayScore === "" ? null : Number(finalAwayScore);
    const homePenalties =
      finalHomePenalties === "" ? null : Number(finalHomePenalties);
    const awayPenalties =
      finalAwayPenalties === "" ? null : Number(finalAwayPenalties);

    if (
      (homeScore === null || awayScore === null) &&
      (homePenalties !== null || awayPenalties !== null)
    ) {
      setFinalMensaje("Solo puedes indicar penaltis cuando hay resultado.");
      return false;
    }

    if (
      homeScore !== null &&
      awayScore !== null &&
      homeScore !== awayScore &&
      (homePenalties !== null || awayPenalties !== null)
    ) {
      setFinalMensaje("Solo debe haber penaltis si el partido acaba empatado.");
      return false;
    }

    if (
      homeScore !== null &&
      awayScore !== null &&
      homeScore === awayScore &&
      ((homePenalties === null && awayPenalties !== null) ||
        (homePenalties !== null && awayPenalties === null))
    ) {
      setFinalMensaje("Si hay penaltis, indica los penaltis de los dos equipos.");
      return false;
    }

    if (
      homeScore !== null &&
      awayScore !== null &&
      homeScore === awayScore &&
      homePenalties !== null &&
      awayPenalties !== null &&
      homePenalties === awayPenalties
    ) {
      setFinalMensaje("Los penaltis no pueden quedar empatados.");
      return false;
    }

    return true;
  }

  async function guardarFinalMatch() {
    if (!validarFinal()) return;

    const homeScore = finalHomeScore === "" ? null : Number(finalHomeScore);
    const awayScore = finalAwayScore === "" ? null : Number(finalAwayScore);
    const homePenalties =
      finalHomePenalties === "" ? null : Number(finalHomePenalties);
    const awayPenalties =
      finalAwayPenalties === "" ? null : Number(finalAwayPenalties);

    const payload = {
      match_date: finalFecha,
      match_time: finalHora,
      field: finalCampo || "Campo 1",
      status: finalEstado,
      home_score: homeScore,
      away_score: awayScore,
      home_penalties: homePenalties,
      away_penalties: awayPenalties,
      mvp_open: finalMvpOpen,
    };

    const { error } = await supabase
      .from("final_matches")
      .update(payload)
      .eq("id", finalSelectedId);

    if (error) {
      setFinalMensaje(`No se ha podido guardar: ${error.message}`);
      return;
    }

    await actualizarArrastresFinales();

    setFinalMensaje("Eliminatoria guardada y cruces actualizados.");
    await cargarDatos();
  }

  const mensajeCorrecto =
    mensaje.includes("correctamente") || mensaje.includes("eliminado");

  const finalMensajeCorrecto =
    finalMensaje.includes("guardada") || finalMensaje.includes("actualizados");

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
            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Calendario, estados y votaciones
            </p>
          </div>

          {loading ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Cargando datos...
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
                      Crear y editar partidos de grupos
                    </p>
                  </div>

                  <span className="text-3xl font-black">
                    {bloqueGruposAbierto ? "−" : "+"}
                  </span>
                </button>

                {bloqueGruposAbierto && (
                  <div className="space-y-5 p-5">
                    {groups.length === 0 ? (
                      <p className="font-bold text-slate-500">
                        Primero crea al menos un grupo.
                      </p>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm font-black uppercase text-slate-500">
                            Grupo
                          </label>

                          <select
                            value={grupo}
                            onChange={(event) =>
                              cambiarGrupo(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                          >
                            {groups.map((group) => (
                              <option key={group.id} value={group.name}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-black uppercase text-slate-500">
                            Partido existente
                          </label>

                          <select
                            value={selectedId}
                            onChange={(event) =>
                              cambiarPartido(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                          >
                            <option value="">Nuevo partido</option>
                            {matchesGrupo.map((match) => (
                              <option key={match.id} value={match.id}>
                                {match.home_team?.name ?? "Local"} vs{" "}
                                {match.away_team?.name ?? "Visitante"} ·{" "}
                                {formatearFechaSegura(match.match_date)} ·{" "}
                                {match.match_time ?? "Hora"}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={limpiarFormulario}
                            className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                          >
                            Crear nuevo partido
                          </button>
                        </div>

                        <div>
                          <label className="text-sm font-black uppercase text-slate-500">
                            Equipo local
                          </label>

                          <select
                            value={homeTeamId}
                            onChange={(event) =>
                              setHomeTeamId(event.target.value)
                            }
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

                        <div>
                          <label className="text-sm font-black uppercase text-slate-500">
                            Equipo visitante
                          </label>

                          <select
                            value={awayTeamId}
                            onChange={(event) =>
                              setAwayTeamId(event.target.value)
                            }
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

                        <div className="grid grid-cols-2 gap-3">
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

                        <div>
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
                          onClick={guardarPartido}
                          className="w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                        >
                          Guardar partido
                        </button>

                        {selectedId && (
                          <button
                            onClick={eliminarPartido}
                            className="w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                          >
                            Eliminar partido
                          </button>
                        )}

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
                      Resultados, horarios y MVP de fase final
                    </p>
                  </div>

                  <span className="text-3xl font-black">
                    {bloqueFinalAbierto ? "−" : "+"}
                  </span>
                </button>

                {bloqueFinalAbierto && (
                  <div className="space-y-5 p-5">
                    {finalMatches.length === 0 ? (
                      <p className="font-bold text-slate-500">
                        Primero configura los cruces en Fase final.
                      </p>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm font-black uppercase text-slate-500">
                            Fase
                          </label>

                          <select
                            value={finalPhase}
                            onChange={(event) => {
                              setFinalPhase(event.target.value);
                              limpiarFinalFormulario();
                            }}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                          >
                            <option>Cuartos</option>
                            <option>Semifinales</option>
                            <option>Tercer puesto</option>
                            <option>Final</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-black uppercase text-slate-500">
                            Cruce
                          </label>

                          <select
                            value={finalSelectedId}
                            onChange={(event) =>
                              cambiarFinalMatch(event.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                          >
                            <option value="">Selecciona cruce</option>
                            {finalMatchesFase.map((match) => (
                              <option key={match.id} value={match.id}>
                                {match.title} · {match.home_ref} vs{" "}
                                {match.away_ref}
                              </option>
                            ))}
                          </select>
                        </div>

                        {finalSelectedId && (
                          <>
                            <div className="rounded-2xl bg-slate-100 p-4">
                              <p className="text-sm font-black uppercase text-slate-500">
                                Partido
                              </p>
                              <p className="mt-2 break-words text-lg font-black leading-tight">
                                {
                                  finalMatches.find(
                                    (match) => match.id === finalSelectedId
                                  )?.home_ref
                                }{" "}
                                vs{" "}
                                {
                                  finalMatches.find(
                                    (match) => match.id === finalSelectedId
                                  )?.away_ref
                                }
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm font-black uppercase text-slate-500">
                                  Fecha
                                </label>
                                <input
                                  type="date"
                                  value={finalFecha}
                                  onChange={(event) =>
                                    setFinalFecha(event.target.value)
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                                />
                              </div>

                              <div>
                                <label className="text-sm font-black uppercase text-slate-500">
                                  Hora
                                </label>
                                <input
                                  type="time"
                                  value={finalHora}
                                  onChange={(event) =>
                                    setFinalHora(event.target.value)
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-black uppercase text-slate-500">
                                Campo
                              </label>
                              <input
                                value={finalCampo}
                                onChange={(event) =>
                                  setFinalCampo(event.target.value)
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                                placeholder="Campo 1"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm font-black uppercase text-slate-500">
                                  Goles local
                                </label>
                                <input
                                  type="number"
                                  value={finalHomeScore}
                                  onChange={(event) =>
                                    setFinalHomeScore(event.target.value)
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                                />
                              </div>

                              <div>
                                <label className="text-sm font-black uppercase text-slate-500">
                                  Goles visitante
                                </label>
                                <input
                                  type="number"
                                  value={finalAwayScore}
                                  onChange={(event) =>
                                    setFinalAwayScore(event.target.value)
                                  }
                                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
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
                              onClick={guardarFinalMatch}
                              className="w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                            >
                              Guardar eliminatoria
                            </button>
                          </>
                        )}

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