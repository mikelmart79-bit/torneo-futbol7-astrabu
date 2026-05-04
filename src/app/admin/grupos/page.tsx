"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Group = {
  id: string;
  name: string;
  sort_order: number;
};

export default function AdminGruposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState("1");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarGrupos();
  }, []);

  async function cargarGrupos() {
    const { data } = await supabase
      .from("groups")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true });

    const rows = (data ?? []) as Group[];
    setGroups(rows);

    if (rows.length > 0 && !selectedId) {
      cargarEnFormulario(rows[0]);
    }
  }

  function cargarEnFormulario(group: Group) {
    setSelectedId(group.id);
    setNombre(group.name);
    setOrden(group.sort_order.toString());
    setMensaje("");
  }

  function nuevoGrupo() {
    setSelectedId("");
    setNombre("");
    setOrden((groups.length + 1).toString());
    setMensaje("");
  }

  async function guardarGrupo() {
    if (!nombre.trim()) {
      setMensaje("Escribe el nombre del grupo.");
      return;
    }

    const payload = {
      name: nombre.trim(),
      sort_order: Number(orden) || 1,
    };

    const { error } = selectedId
      ? await supabase.from("groups").update(payload).eq("id", selectedId)
      : await supabase.from("groups").insert(payload);

    if (error) {
      setMensaje(`No se ha podido guardar el grupo: ${error.message}`);
      return;
    }

    setMensaje("Grupo guardado correctamente.");
    await cargarGrupos();
  }

  async function eliminarGrupo() {
    if (!selectedId) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar este grupo? Los equipos que tengan este nombre de grupo no se borrarán, pero quedarán asociados a un grupo que ya no existe."
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", selectedId);

    if (error) {
      setMensaje(`No se ha podido eliminar el grupo: ${error.message}`);
      return;
    }

    setMensaje("Grupo eliminado.");
    nuevoGrupo();
    await cargarGrupos();
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
              Grupos
            </h1>
          </div>

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            <label className="text-sm font-black uppercase text-slate-500">
              Grupo existente
            </label>

            <select
              value={selectedId}
              onChange={(event) => {
                const group = groups.find(
                  (item) => item.id === event.target.value
                );
                if (group) cargarEnFormulario(group);
                if (!event.target.value) nuevoGrupo();
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
            >
              <option value="">Nuevo grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.sort_order}. {group.name}
                </option>
              ))}
            </select>

            <button
              onClick={nuevoGrupo}
              className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
            >
              Crear nuevo grupo
            </button>
          </div>

          <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            <div>
              <label className="text-sm font-black uppercase text-slate-500">
                Nombre del grupo
              </label>
              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                placeholder="Grupo A"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-black uppercase text-slate-500">
                Orden
              </label>
              <input
                type="number"
                value={orden}
                onChange={(event) => setOrden(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
              />
            </div>

            <button
              onClick={guardarGrupo}
              className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
            >
              Guardar grupo
            </button>

            {selectedId && (
              <button
                onClick={eliminarGrupo}
                className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
              >
                Eliminar grupo
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