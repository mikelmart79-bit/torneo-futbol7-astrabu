"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Rule = {
  id: string;
  text: string;
  sort_order: number;
};

export default function NormativaPage() {
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    async function cargarNormativa() {
      const { data } = await supabase
        .from("rules")
        .select("id, text, sort_order")
        .order("sort_order", { ascending: true });

      setRules((data ?? []) as Rule[]);
    }

    cargarNormativa();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-4 py-6 pb-24">
        <div className="rounded-3xl bg-black/55 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>
          <h1 className="mt-2 text-center text-3xl font-black">Normativa</h1>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto rounded-3xl bg-white/90 p-4 text-slate-900 shadow-2xl backdrop-blur">
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={rule.id} className="rounded-2xl bg-white p-4 shadow">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
                    {index + 1}
                  </div>

                  <p className="font-semibold leading-relaxed">{rule.text}</p>
                </div>
              </div>
            ))}

            {rules.length === 0 && (
              <p className="rounded-2xl bg-white p-4 font-bold text-slate-500 shadow">
                Todavía no hay normativa cargada.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}