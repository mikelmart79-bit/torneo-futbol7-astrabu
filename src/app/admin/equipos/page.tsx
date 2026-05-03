"use client";

import { useState } from "react";
import { teams } from "@/data/demo";

export default function AdminEquiposPage() {
  const [equipoId, setEquipoId] = useState(teams[0]?.id ?? "");
  const equipo = teams.find((team) => team.id === equipoId);

  const [nombre, setNombre] = useState(equipo?.name ?? "");
  const [grupo, setGrupo] = useState(equipo?.group ?? "Grupo A");
  const [colorLocal, setColorLocal] = useState("#047857");
  const [colorVisitante, setColorVisitante] = useState("#dc2626");
  const [mensaje, setMensaje] = useState("");

  function cambiarEquipo(id: string) {
    const nuevoEquipo = teams.find((team) => team.id === id);
    setEquipoId(id);
    setNombre(nuevoEquipo?.name ?? "");
    setGrupo(nuevoEquipo?.group ?? "Grupo A");
    setMensaje("");
  }

  function guardarEquipo() {
    setMensaje(`Equipo guardado en modo demo: ${nombre} · ${grupo}`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6">
        <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-emerald-200">
            Panel admin
          </p>
          <h1 className="mt-2 text-3xl font-black">Gestionar equipos</h1>
          <p className="mt-2 text-emerald-100">
            Alta, edición y colores de equipación.
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <label className="text-sm font-black uppercase text-slate-500">
            Equipo
          </label>

          <select
            value={equipoId}
            onChange={(event) => cambiarEquipo(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} · {team.group}
              </option>
            ))}
          </select>

          <div className="mt-5">
            <label className="text-sm font-black uppercase text-slate-500">
              Nombre del equipo
            </label>
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
            />
          </div>

          <div className="mt-5">
            <label className="text-sm font-black uppercase text-slate-500">
              Grupo
            </label>
            <select
              value={grupo}
              onChange={(event) => setGrupo(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
            >
              <option>Grupo A</option>
              <option>Grupo B</option>
              <option>Grupo C</option>
              <option>Grupo D</option>
            </select>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase text-slate-500">
                1ª equipación
              </label>
              <input
                type="color"
                value={colorLocal}
                onChange={(event) => setColorLocal(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-500">
                Alternativa
              </label>
              <input
                type="color"
                value={colorVisitante}
                onChange={(event) => setColorVisitante(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <button
            onClick={guardarEquipo}
            className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
          >
            Guardar equipo
          </button>

          <button className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow">
            Crear nuevo equipo
          </button>

          {mensaje && (
            <div className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm font-bold text-emerald-800">
              {mensaje}
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            De momento es modo demo. Después guardaremos cambios en Supabase.
          </p>
        </div>
      </section>
    </main>
  );
}