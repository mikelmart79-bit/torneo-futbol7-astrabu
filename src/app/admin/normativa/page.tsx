"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Rule = {
  id: string;
  content: string;
  sort_order: number;
};

type ParsedRule = {
  title: string;
  body: string;
};

function parseRule(content: string, fallbackTitle: string): ParsedRule {
  const lines = content.trim().split("\n");
  const firstLine = lines[0]?.trim() ?? "";

  if (firstLine.startsWith("#")) {
    const title = firstLine.replace(/^#+/, "").trim();
    const body = lines.slice(1).join("\n").trim();

    return {
      title: title || fallbackTitle,
      body: body || "",
    };
  }

  return {
    title: fallbackTitle,
    body: content.trim(),
  };
}

function construirContenido(title: string, body: string) {
  return `# ${title.trim()}\n${body.trim()}`;
}

export default function AdminNormativaPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [titulo, setTitulo] = useState("");
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
    const parsed = parseRule(rule.content, `Norma ${rule.sort_order}`);

    setSelectedId(rule.id);
    setTitulo(parsed.title);
    setTexto(parsed.body);
    setOrden(rule.sort_order.toString());
    setMensaje("");
  }

  function nuevaRegla() {
    setSelectedId("");
    setTitulo("");
    setTexto("");
    setOrden((rules.length + 1).toString());
    setMensaje("");
  }

  function rellenarDuracion() {
    setSelectedId("");
    setTitulo("Duración de los partidos");
    setTexto("Los partidos se disputarán en dos tiempos de 30 minutos cada uno.");
    setOrden((rules.length + 1).toString());
    setMensaje("");
  }

  function rellenarJugadoresCampo() {
    setSelectedId("");
    setTitulo("Jugadores de campo obligatorios");
    setTexto(
      "Cada equipo deberá mantener en todo momento un mínimo de 4 jugadores de campo sobre el terreno de juego. Esta norma es obligatoria durante todo el partido."
    );
    setOrden((rules.length + 1).toString());
    setMensaje("");
  }

  async function guardarRegla() {
    if (!titulo.trim()) {
      setMensaje("Escribe el título del bloque.");
      return;
    }

    if (!texto.trim()) {
      setMensaje("Escribe el texto de la regla.");
      return;
    }

    const payload = {
      content: construirContenido(titulo, texto),
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
    setTitulo("");
    setTexto("");
    setOrden("1");
    await cargarNormativa();
  }

  const mensajeEsCorrecto =
    mensaje.includes("correctamente") || mensaje.includes("eliminada");

  const previewContent =
    titulo.trim() || texto.trim()
      ? construirContenido(titulo || "Título del bloque", texto || "Texto de la regla...")
      : "";

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
                  Bloque existente
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
                  <option value="">Nuevo bloque</option>

                  {rules.map((rule) => {
                    const parsed = parseRule(
                      rule.content,
                      `Norma ${rule.sort_order}`
                    );

                    return (
                      <option key={rule.id} value={rule.id}>
                        {rule.sort_order}. {parsed.title.slice(0, 45)}
                        {parsed.title.length > 45 ? "..." : ""}
                      </option>
                    );
                  })}
                </select>

                <button
                  onClick={nuevaRegla}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                >
                  Crear nuevo bloque
                </button>
              </div>

              <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <p className="text-sm font-black uppercase tracking-widest text-red-600">
                  Bloques rápidos
                </p>

                <p className="mt-2 text-sm font-bold text-slate-500">
                  Puedes cargar estas normas base y luego guardarlas.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <button
                    onClick={rellenarDuracion}
                    className="rounded-xl bg-red-600 py-3 text-sm font-black text-white shadow"
                  >
                    Añadir duración: 2 tiempos de 30 min
                  </button>

                  <button
                    onClick={rellenarJugadoresCampo}
                    className="rounded-xl bg-slate-900 py-3 text-sm font-black text-white shadow"
                  >
                    Añadir mínimo 4 jugadores de campo
                  </button>
                </div>
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
                    Título del bloque
                  </label>

                  <input
                    value={titulo}
                    onChange={(event) => setTitulo(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    placeholder="Ejemplo: Duración de los partidos"
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

                {previewContent.trim() && (
                  <div className="mt-4 overflow-hidden rounded-2xl bg-slate-100">
                    <div className="bg-red-600 px-4 py-3 text-white">
                      <p className="text-xs font-black uppercase tracking-widest text-red-100">
                        Vista previa
                      </p>

                      <p className="mt-1 break-words text-lg font-black leading-tight">
                        {titulo || "Título del bloque"}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="whitespace-pre-line break-words text-sm font-bold leading-relaxed text-slate-800">
                        {texto || "Texto de la regla..."}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={guardarRegla}
                  className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                >
                  Guardar bloque
                </button>

                {selectedId && (
                  <button
                    onClick={eliminarRegla}
                    className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                  >
                    Eliminar bloque
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
                  Bloques actuales
                </p>

                {rules.length === 0 ? (
                  <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    Todavía no hay reglas creadas.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {rules.map((rule) => {
                      const parsed = parseRule(
                        rule.content,
                        `Norma ${rule.sort_order}`
                      );

                      return (
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
                            Bloque {rule.sort_order}
                          </p>

                          <p className="mt-1 break-words text-base font-black leading-tight">
                            {parsed.title}
                          </p>

                          <p className="mt-2 line-clamp-3 whitespace-pre-line break-words text-sm font-bold leading-relaxed opacity-80">
                            {parsed.body}
                          </p>
                        </button>
                      );
                    })}
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