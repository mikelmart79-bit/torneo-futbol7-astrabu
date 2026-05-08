"use client";

import { useEffect, useState } from "react";
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

function parseRule(content: string, index: number): ParsedRule {
  const lines = content.trim().split("\n");
  const firstLine = lines[0]?.trim() ?? "";

  if (firstLine.startsWith("#")) {
    const title = firstLine.replace(/^#+/, "").trim();
    const body = lines.slice(1).join("\n").trim();

    return {
      title: title || `Norma ${index + 1}`,
      body: body || "Sin contenido.",
    };
  }

  return {
    title: `Norma ${index + 1}`,
    body: content.trim(),
  };
}

export default function NormativaPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    async function cargarNormativa() {
      setLoading(true);
      setErrorCarga("");

      const { data, error } = await supabase
        .from("rules")
        .select("id, content, sort_order")
        .order("sort_order", { ascending: true });

      if (error) {
        setErrorCarga("No se ha podido cargar la normativa.");
        setLoading(false);
        return;
      }

      setRules((data ?? []) as Rule[]);
      setLoading(false);
    }

    cargarNormativa();
  }, []);

  return (
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

          <h1 className="mt-2 text-center text-3xl font-black">Normativa</h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Reglas generales del torneo
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold text-slate-500 shadow-2xl">
            Cargando normativa...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 font-bold text-red-700 shadow-2xl">
            {errorCarga}
          </div>
        ) : rules.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl">
            <p className="font-bold text-slate-500">
              No hay normativa definida.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {rules.map((rule, index) => {
              const parsed = parseRule(rule.content, index);

              return (
                <div
                  key={rule.id}
                  className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur"
                >
                  <div className="bg-red-600 px-5 py-4 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-100">
                          Bloque {index + 1}
                        </p>

                        <h2 className="mt-1 break-words text-xl font-black leading-tight">
                          {parsed.title}
                        </h2>
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-black">
                        {index + 1}
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="whitespace-pre-line break-words text-base font-bold leading-relaxed text-slate-800">
                      {parsed.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}