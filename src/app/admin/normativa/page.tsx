"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Rule = {
  id: string;
  content: string;
  sort_order: number;
};

export default function AdminNormativaPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [texto, setTexto] = useState("");
  const [orden, setOrden] = useState("1");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarNormativa();
  }, []);

  async function cargarNormativa() {
    setLoading(true);

    const { data, error } = await supabase
      .from("rules")
      .select("id, content, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      setMensaje("No se ha podido cargar la normativa.");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Rule[];
    setRules(rows);

    if (rows.length > 0 && !selectedId) {
      cargarEnFormulario(rows[0]);
    }

    if (rows.length === 0) {
      nuevaRegla();
    }

    setLoading(false);
  }

  function cargarEnFormulario(rule: Rule) {
    setSelectedId(rule.id);
    setTexto(rule.content);
    setOrden(rule.sort_order.toString());
    setMensaje("");
  }

  function nuevaRegla() {
    setSelectedId("");
    setTexto("");
    setOrden((rules.length + 1).toString());
    setMensaje("");
  }

  async function guardarRegla() {
    if (!texto.trim()) {
      setMensaje("Escribe el texto de la regla.");
      return;
    }

    const payload = {
      content: texto.trim(),
      sort_order: Number(orden) || 1,
    };

    const { error } = selectedId
      ? await supabase.from("rules").update(payload).eq("id", selectedId)
      : await supabase.from("rules").insert(payload);

    if (error) {
      console.error("Error guardando regla:", error);
      setMensaje(`No se ha podido guardar la regla: ${error.message}`);
      return;
    }

    setMensaje("Regla guardada correctamente.");
    await cargarNormativa();
  }

  async function eliminarRegla() {
    if (!selectedId) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar esta regla de la normativa?"
    );

    if (!confirmar) return;

    const { error } = await supabase.from("rules").delete().eq("id", selectedId);

    if (error) {
      setMensaje("No se ha podido eliminar la regla.");
      return;
    }

    setMensaje("Regla eliminada.");
    setSelectedId("");
    setTexto("");
    setOrden("1");
    await cargarNormativa();
  }

  const mensajeEsCorrecto =
    mensaje.includes("correctamente") || mensaje.includes("eliminada");

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
              Normativa
            </h1>
            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Gestión de reglas del torneo
            </p>
          </div>

          {loading ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Cargando normativa...
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <label className="text-sm font-black uppercase text-slate-500">
                  Regla existente
                </label>

                <select
                  value={selectedId}
                  onChange={(event) => {
                    const rule = rules.find(
                      (item) => item.id === event.target.value
                    );

                    if (rule) cargarEnFormulario(rule);
                    if (!event.target.value) nuevaRegla();
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="">Nueva regla</option>
                  {rules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.sort_order}. {rule.content.slice(0, 45)}
                      {rule.content.length > 45 ? "..." : ""}
                    </option>
                  ))}
                </select>

                <button
                  onClick={nuevaRegla}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                >
                  Crear nueva regla
                </button>
              </div>

              <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <div>
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

                <div className="mt-4">
                  <label className="text-sm font-black uppercase text-slate-500">
                    Texto de la regla
                  </label>
                  <textarea
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    rows={7}
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    placeholder="Escribe aquí la regla..."
                  />
                </div>

                {texto.trim() && (
                  <div className="mt-4 rounded-2xl bg-slate-100 p-4">
                    <p className="text-xs font-black uppercase text-red-600">
                      Vista previa
                    </p>
                    <p className="mt-2 whitespace-pre-line break-words text-sm font-bold leading-relaxed text-slate-800">
                      {texto}
                    </p>
                  </div>
                )}

                <button
                  onClick={guardarRegla}
                  className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                >
                  Guardar regla
                </button>

                {selectedId && (
                  <button
                    onClick={eliminarRegla}
                    className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                  >
                    Eliminar regla
                  </button>
                )}

                {mensaje && (
                  <div
                    className={`mt-4 rounded-xl p-3 text-sm font-bold ${
                      mensajeEsCorrecto
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
                  Reglas actuales
                </p>

                {rules.length === 0 ? (
                  <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    Todavía no hay reglas creadas.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {rules.map((rule) => (
                      <button
                        key={rule.id}
                        onClick={() => cargarEnFormulario(rule)}
                        className={`w-full rounded-2xl p-4 text-left shadow-sm ${
                          selectedId === rule.id
                            ? "bg-red-600 text-white"
                            : "bg-slate-50 text-slate-900"
                        }`}
                      >
                        <p className="text-xs font-black uppercase opacity-80">
                          Norma {rule.sort_order}
                        </p>
                        <p className="mt-1 whitespace-pre-line break-words text-sm font-bold leading-relaxed">
                          {rule.content}
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