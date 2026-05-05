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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarGrupos();
  }, []);

  async function cargarGrupos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("groups")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      setMensaje("No se han podido cargar los grupos.");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Group[];
    setGroups(rows);

    if (rows.length > 0 && !selectedId) {
      cargarEnFormulario(rows[0]);
    }

    if (rows.length === 0) {
      nuevoGrupo();
    }

    setLoading(false);
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

  async function actualizarReferenciasGrupo(nombreAnterior: string, nombreNuevo: string) {
    if (!nombreAnterior || !nombreNuevo || nombreAnterior === nombreNuevo) return;

    const { error: teamsError } = await supabase
      .from("teams")
      .update({ group_name: nombreNuevo })
      .eq("group_name", nombreAnterior);

    if (teamsError) {
      throw new Error("No se han podido actualizar los equipos del grupo.");
    }

    const { error: matchesError } = await supabase
      .from("matches")
      .update({ group_name: nombreNuevo })
      .eq("group_name", nombreAnterior);

    if (matchesError) {
      throw new Error("No se han podido actualizar los partidos del grupo.");
    }

    const { error: finalHomeError } = await supabase
      .from("final_matches")
      .update({ home_group: nombreNuevo })
      .eq("home_group", nombreAnterior);

    if (finalHomeError) {
      throw new Error("No se han podido actualizar referencias locales de fase final.");
    }

    const { error: finalAwayError } = await supabase
      .from("final_matches")
      .update({ away_group: nombreNuevo })
      .eq("away_group", nombreAnterior);

    if (finalAwayError) {
      throw new Error("No se han podido actualizar referencias visitantes de fase final.");
    }
  }

  async function guardarGrupo() {
    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setMensaje("Escribe el nombre del grupo.");
      return;
    }

    const grupoActual = groups.find((group) => group.id === selectedId);
    const nombreAnterior = grupoActual?.name ?? "";

    const payload = {
      name: nombreLimpio,
      sort_order: Number(orden) || 1,
    };

    const { error } = selectedId
      ? await supabase.from("groups").update(payload).eq("id", selectedId)
      : await supabase.from("groups").insert(payload);

    if (error) {
      setMensaje(`No se ha podido guardar el grupo: ${error.message}`);
      return;
    }

    try {
      if (selectedId && nombreAnterior && nombreAnterior !== nombreLimpio) {
        await actualizarReferenciasGrupo(nombreAnterior, nombreLimpio);
      }

      setMensaje("Grupo guardado correctamente.");
      await cargarGrupos();
    } catch (err) {
      const texto =
        err instanceof Error
          ? err.message
          : "Grupo guardado, pero no se han podido actualizar algunas referencias.";

      setMensaje(texto);
      await cargarGrupos();
    }
  }

  async function grupoTieneDatosAsociados(groupName: string) {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id")
      .eq("group_name", groupName)
      .limit(1);

    if ((teamsData ?? []).length > 0) return true;

    const { data: matchesData } = await supabase
      .from("matches")
      .select("id")
      .eq("group_name", groupName)
      .limit(1);

    if ((matchesData ?? []).length > 0) return true;

    const { data: finalHomeData } = await supabase
      .from("final_matches")
      .select("id")
      .eq("home_group", groupName)
      .limit(1);

    if ((finalHomeData ?? []).length > 0) return true;

    const { data: finalAwayData } = await supabase
      .from("final_matches")
      .select("id")
      .eq("away_group", groupName)
      .limit(1);

    if ((finalAwayData ?? []).length > 0) return true;

    return false;
  }

  async function eliminarGrupo() {
    if (!selectedId) return;

    const grupoActual = groups.find((group) => group.id === selectedId);

    if (!grupoActual) {
      setMensaje("No se ha encontrado el grupo seleccionado.");
      return;
    }

    const tieneDatos = await grupoTieneDatosAsociados(grupoActual.name);

    if (tieneDatos) {
      setMensaje(
        "No se puede eliminar este grupo porque tiene equipos, partidos o cruces asociados. Borra o cambia primero esos datos."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar el grupo "${grupoActual.name}"?`
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
    setSelectedId("");
    setNombre("");
    setOrden("1");
    await cargarGrupos();
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
            <h1 className="mt-2 text-center text-3xl font-black">
              Grupos
            </h1>
            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Gestión de grupos del torneo
            </p>
          </div>

          {loading ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Cargando grupos...
            </div>
          ) : (
            <>
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
                  Grupos actuales
                </p>

                {groups.length === 0 ? (
                  <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    Todavía no hay grupos creados.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => cargarEnFormulario(group)}
                        className={`w-full rounded-2xl p-4 text-left shadow-sm ${
                          selectedId === group.id
                            ? "bg-red-600 text-white"
                            : "bg-slate-50 text-slate-900"
                        }`}
                      >
                        <p className="text-xs font-black uppercase opacity-80">
                          Orden {group.sort_order}
                        </p>
                        <p className="mt-1 break-words text-lg font-black leading-tight">
                          {group.name}
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