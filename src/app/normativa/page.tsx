"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Rule = {
  id: string;
  content: string;
  sort_order: number;
};

export default function NormativaPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarNormativa() {
      const { data } = await supabase
        .from("rules")
        .select("*")
        .order("sort_order", { ascending: true });

      setRules((data ?? []) as Rule[]);
      setLoading(false);
    }

    cargarNormativa();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      {/* FONDO IGUAL QUE EL RESTO */}
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
        {/* HEADER IGUAL */}
        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>
          <h1 className="mt-2 text-center text-3xl font-black">
            Normativa
          </h1>
        </div>

        {/* CONTENIDO */}
        <div className="mt-6 rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur">
          {loading ? (
            <p className="font-bold text-slate-500">Cargando normativa...</p>
          ) : rules.length === 0 ? (
            <p className="font-bold text-slate-500">
              No hay normativa definida.
            </p>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="rounded-2xl bg-white p-4 shadow"
                >
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
                      {index + 1}
                    </div>

                    <p className="font-semibold leading-relaxed">
                      {rule.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}