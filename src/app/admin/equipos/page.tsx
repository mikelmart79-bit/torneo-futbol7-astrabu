"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
  home_color: string | null;
  away_color: string | null;
};

type Group = {
  id: string;
  name: string;
  sort_order: number;
};

export default function AdminEquiposPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [equipoId, setEquipoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [grupo, setGrupo] = useState("");
  const [colorLocal, setColorLocal] = useState("#047857");
  const [colorVisitante, setColorVisitante] = useState("#dc2626");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

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
      setMensaje("No se han podido cargar los grupos.");
      setLoading(false);
      return;
    }

    const grupos = (groupsData ?? []) as Group[];
    setGroups(grupos);

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name, home_color, away_color")
      .order("group_name", { ascending: true })
      .order("name", { ascending: true });

    if (teamsError) {
      setMensaje("No se han podido cargar los equipos.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

    if (equipos.length > 0 && !equipoId) {
      seleccionarEquipo(equipos[0]);
    } else if (equipos.length === 0) {
      setGrupo(grupos[0]?.name ?? "");
    }

    setLoading(false);
  }

  function seleccionarEquipo(team: Team) {
    setEquipoId(team.id);
    setNombre(team.name);
    setGrupo(team.group_name ?? "");
    setColorLocal(team.home_color || "#047857");
    setColorVisitante(team.away_color || "#dc2626");
    setMensaje("");
  }

  function cambiarEquipo(id: string) {
    if (!id) {
      nuevoEquipo();
      return;
    }

    const team = teams.find((item) => item.id === id);

    if (team) {
      seleccionarEquipo(team);
    }
  }

  function nuevoEquipo() {
    setEquipoId("");
    setNombre("");
    setGrupo(groups[0]?.name ?? "");
    setColorLocal("#047857");
    setColorVisitante("#dc2626");
    setMensaje("");
  }

  function existeEquipoDuplicado(nombreEquipo: string, grupoEquipo: string) {
    const nombreLimpio = nombreEquipo.trim().toLowerCase();
    const grupoLimpio = grupoEquipo.trim().toLowerCase();

    return teams.some((team) => {
      if (team.id === equipoId) return false;

      return (
        team.name.trim().toLowerCase() === nombreLimpio &&
        (team.group_name ?? "").trim().toLowerCase() === grupoLimpio
      );
    });
  }

  async function actualizarReferenciasFinales(
    nombreAnterior: string,
    nombreNuevo: string
  ) {
    if (!nombreAnterior || !nombreNuevo || nombreAnterior === nombreNuevo) return;

    const { error: homeError } = await supabase
      .from("final_matches")
      .update({ home_ref: nombreNuevo })
      .eq("home_ref", nombreAnterior);

    if (homeError) {
      throw new Error("Equipo guardado, pero no se pudo actualizar la fase final.");
    }

    const { error: awayError } = await supabase
      .from("final_matches")
      .update({ away_ref: nombreNuevo })
      .eq("away_ref", nombreAnterior);

    if (awayError) {
      throw new Error("Equipo guardado, pero no se pudo actualizar la fase final.");
    }
  }

  async function guardarEquipo() {
    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setMensaje("Escribe el nombre del equipo.");
      return;
    }

    if (!grupo) {
      setMensaje("Crea o selecciona un grupo antes de guardar el equipo.");
      return;
    }

    if (existeEquipoDuplicado(nombreLimpio, grupo)) {
      setMensaje("Ya existe un equipo con ese nombre en ese grupo.");
      return;
    }

    const equipoActual = teams.find((team) => team.id === equipoId);
    const nombreAnterior = equipoActual?.name ?? "";

    const payload = {
      name: nombreLimpio,
      group_name: grupo,
      home_color: colorLocal,
      away_color: colorVisitante,
    };

    const { error } = equipoId
      ? await supabase.from("teams").update(payload).eq("id", equipoId)
      : await supabase.from("teams").insert(payload);

    if (error) {
      setMensaje(`Error guardando equipo: ${error.message}`);
      return;
    }

    try {
      if (equipoId && nombreAnterior && nombreAnterior !== nombreLimpio) {
        await actualizarReferenciasFinales(nombreAnterior, nombreLimpio);
      }

      setMensaje("Equipo guardado correctamente.");
      await cargarDatos();
    } catch (err) {
      const texto =
        err instanceof Error
          ? err.message
          : "Equipo guardado, pero hubo un problema actualizando referencias.";

      setMensaje(texto);
      await cargarDatos();
    }
  }

  async function equipoTieneDatosAsociados(teamId: string, teamName: string) {
    const { data: partidosLocal } = await supabase
      .from("matches")
      .select("id")
      .eq("home_team_id", teamId)
      .limit(1);

    if ((partidosLocal ?? []).length > 0) return true;

    const { data: partidosVisitante } = await supabase
      .from("matches")
      .select("id")
      .eq("away_team_id", teamId)
      .limit(1);

    if ((partidosVisitante ?? []).length > 0) return true;

    const { data: jugadores } = await supabase
      .from("players")
      .select("id")
      .eq("team_id", teamId)
      .limit(1);

    if ((jugadores ?? []).length > 0) return true;

    const { data: finalLocal } = await supabase
      .from("final_matches")
      .select("id")
      .eq("home_ref", teamName)
      .limit(1);

    if ((finalLocal ?? []).length > 0) return true;

    const { data: finalVisitante } = await supabase
      .from("final_matches")
      .select("id")
      .eq("away_ref", teamName)
      .limit(1);

    if ((finalVisitante ?? []).length > 0) return true;

    return false;
  }

  async function eliminarEquipo() {
    if (!equipoId) return;

    const equipoActual = teams.find((team) => team.id === equipoId);

    if (!equipoActual) {
      setMensaje("No se ha encontrado el equipo seleccionado.");
      return;
    }

    const tieneDatos = await equipoTieneDatosAsociados(
      equipoActual.id,
      equipoActual.name
    );

    if (tieneDatos) {
      setMensaje(
        "No se puede eliminar este equipo porque tiene jugadores, partidos o cruces asociados. Borra primero esos datos."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar el equipo "${equipoActual.name}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase.from("teams").delete().eq("id", equipoId);

    if (error) {
      setMensaje(`Error eliminando equipo: ${error.message}`);
      return;
    }

    setMensaje("Equipo eliminado.");
    setEquipoId("");
    setNombre("");
    setGrupo(groups[0]?.name ?? "");
    setColorLocal("#047857");
    setColorVisitante("#dc2626");

    await cargarDatos();
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
            <h1 className="mt-2 text-center text-3xl font-black">Equipos</h1>
            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Gestión de equipos del torneo
            </p>
          </div>

          {loading ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Cargando equipos...
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <label className="text-sm font-black uppercase text-slate-500">
                  Equipo existente
                </label>

                <select
                  value={equipoId}
                  onChange={(event) => cambiarEquipo(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="">Nuevo equipo</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} · {team.group_name ?? "Sin grupo"}
                    </option>
                  ))}
                </select>

                <button
                  onClick={nuevoEquipo}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                >
                  Crear nuevo equipo
                </button>
              </div>

              <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <div>
                  <label className="text-sm font-black uppercase text-slate-500">
                    Nombre
                  </label>
                  <input
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    placeholder="Nombre del equipo"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-sm font-black uppercase text-slate-500">
                    Grupo
                  </label>

                  <select
                    value={grupo}
                    onChange={(event) => setGrupo(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    {groups.length === 0 ? (
                      <option value="">No hay grupos creados</option>
                    ) : (
                      groups.map((group) => (
                        <option key={group.id} value={group.name}>
                          {group.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3">
                    <label className="text-xs font-black uppercase text-slate-500">
                      Color local
                    </label>
                    <input
                      type="color"
                      value={colorLocal}
                      onChange={(event) => setColorLocal(event.target.value)}
                      className="mt-2 h-12 w-full rounded-xl"
                    />
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-3">
                    <label className="text-xs font-black uppercase text-slate-500">
                      Color visitante
                    </label>
                    <input
                      type="color"
                      value={colorVisitante}
                      onChange={(event) => setColorVisitante(event.target.value)}
                      className="mt-2 h-12 w-full rounded-xl"
                    />
                  </div>
                </div>

                <button
                  onClick={guardarEquipo}
                  className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                >
                  Guardar equipo
                </button>

                {equipoId && (
                  <button
                    onClick={eliminarEquipo}
                    className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                  >
                    Eliminar equipo
                  </button>
                )}

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
              </div>

              <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <p className="text-sm font-black uppercase text-slate-500">
                  Equipos actuales
                </p>

                {teams.length === 0 ? (
                  <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    Todavía no hay equipos creados.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => seleccionarEquipo(team)}
                        className={`w-full rounded-2xl p-4 text-left shadow-sm ${
                          equipoId === team.id
                            ? "bg-red-600 text-white"
                            : "bg-slate-50 text-slate-900"
                        }`}
                      >
                        <p className="break-words text-lg font-black leading-tight">
                          {team.name}
                        </p>
                        <p
                          className={`mt-1 text-xs font-bold ${
                            equipoId === team.id
                              ? "text-red-100"
                              : "text-slate-500"
                          }`}
                        >
                          {team.group_name ?? "Sin grupo"}
                        </p>
                      </button>
                    ))}
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