"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string;
  home_color: string | null;
  away_color: string | null;
};

export default function AdminEquiposPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [equipoId, setEquipoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [grupo, setGrupo] = useState("Grupo A");
  const [colorLocal, setColorLocal] = useState("#047857");
  const [colorVisitante, setColorVisitante] = useState("#dc2626");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarEquipos();
  }, []);

  async function cargarEquipos() {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("group_name", { ascending: true })
      .order("name", { ascending: true });

    if (!error && data) {
      setTeams(data);
      if (data.length > 0) {
        seleccionarEquipo(data[0]);
      }
    }
  }

  function seleccionarEquipo(team: Team) {
    setEquipoId(team.id);
    setNombre(team.name);
    setGrupo(team.group_name);
    setColorLocal(team.home_color || "#047857");
    setColorVisitante(team.away_color || "#dc2626");
    setMensaje("");
  }

  function cambiarEquipo(id: string) {
    const team = teams.find((t) => t.id === id);
    if (team) seleccionarEquipo(team);
  }

  function nuevoEquipo() {
    setEquipoId("");
    setNombre("");
    setGrupo("Grupo A");
    setColorLocal("#047857");
    setColorVisitante("#dc2626");
    setMensaje("");
  }

  async function guardarEquipo() {
    if (!nombre.trim()) return;

    const payload = {
      name: nombre,
      group_name: grupo,
      home_color: colorLocal,
      away_color: colorVisitante,
    };

    let error;

    if (equipoId) {
      // EDITAR
      ({ error } = await supabase
        .from("teams")
        .update(payload)
        .eq("id", equipoId));
    } else {
      // CREAR
      ({ error } = await supabase.from("teams").insert(payload));
    }

    if (error) {
      setMensaje("Error guardando equipo");
      return;
    }

    setMensaje("Equipo guardado correctamente");
    await cargarEquipos();
  }

  async function eliminarEquipo() {
    if (!equipoId) return;

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", equipoId);

    if (error) {
      setMensaje("Error eliminando equipo");
      return;
    }

    setMensaje("Equipo eliminado");
    nuevoEquipo();
    await cargarEquipos();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6">
        {/* HEADER */}
        <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-emerald-200">
            Panel admin
          </p>
          <h1 className="mt-2 text-3xl font-black">Equipos</h1>
        </div>

        {/* SELECT */}
        <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <label className="text-sm font-black uppercase text-slate-500">
            Equipo
          </label>

          <select
            value={equipoId}
            onChange={(e) => cambiarEquipo(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
          >
            <option value="">Nuevo equipo</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} · {team.group_name}
              </option>
            ))}
          </select>

          <button
            onClick={nuevoEquipo}
            className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white"
          >
            Crear nuevo equipo
          </button>
        </div>

        {/* FORM */}
        <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <div>
            <label className="text-sm font-black uppercase text-slate-500">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-2 w-full rounded-xl border p-3 font-bold"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-black uppercase text-slate-500">
              Grupo
            </label>
            <select
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              className="mt-2 w-full rounded-xl border p-3 font-bold"
            >
              <option>Grupo A</option>
              <option>Grupo B</option>
              <option>Grupo C</option>
              <option>Grupo D</option>
            </select>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black">Local</label>
              <input
                type="color"
                value={colorLocal}
                onChange={(e) => setColorLocal(e.target.value)}
                className="mt-2 h-12 w-full"
              />
            </div>

            <div>
              <label className="text-xs font-black">Visitante</label>
              <input
                type="color"
                value={colorVisitante}
                onChange={(e) => setColorVisitante(e.target.value)}
                className="mt-2 h-12 w-full"
              />
            </div>
          </div>

          <button
            onClick={guardarEquipo}
            className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white"
          >
            Guardar
          </button>

          {equipoId && (
            <button
              onClick={eliminarEquipo}
              className="mt-3 w-full rounded-xl bg-black py-3 font-black text-white"
            >
              Eliminar equipo
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
  );
}