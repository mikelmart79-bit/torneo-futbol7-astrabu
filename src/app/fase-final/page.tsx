"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FinalMatch = {
  id: string;
  phase: string;
  title: string;
  home_ref: string;
  away_ref: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  sort_order: number;
};

export default function FaseFinalPage() {
  const [matches, setMatches] = useState<FinalMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarCruces() {
      const { data, error } = await supabase
        .from("final_matches")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!error) {
        setMatches(data ?? []);
      }

      setLoading(false);
    }

    cargarCruces();
  }, []);

  const fases = ["Cuartos", "Semifinales", "Final", "Tercer puesto"];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-20">
        <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-emerald-200">
            Torneo verano 2026
          </p>
          <h1 className="mt-2 text-3xl font-black">Fase final</h1>
          <p className="mt-2 text-emerald-100">
            Cruces configurables desde el panel admin.
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando fase final...
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {fases.map((fase) => {
              const cruces = matches.filter((match) => match.phase === fase);

              if (cruces.length === 0) return null;

              return (
                <div
                  key={fase}
                  className={`rounded-3xl p-5 shadow-2xl backdrop-blur ${
                    fase === "Final"
                      ? "bg-red-600 text-white"
                      : "bg-white/95 text-slate-900"
                  }`}
                >
                  <h2 className="text-xl font-black">{fase}</h2>

                  <div className="mt-4 space-y-3">
                    {cruces.map((match) => (
                      <div
                        key={match.id}
                        className={`rounded-2xl p-4 shadow-sm ${
                          fase === "Final"
                            ? "bg-white/15"
                            : "bg-slate-50"
                        }`}
                      >
                        <p
                          className={`text-sm font-black ${
                            fase === "Final"
                              ? "text-red-100"
                              : "text-red-600"
                          }`}
                        >
                          {match.title}
                        </p>

                        <div className="mt-2 grid grid-cols-[1fr_44px] items-center gap-2">
                          <p className="text-lg font-black">
                            {match.home_ref}
                          </p>
                          <p className="text-center text-2xl font-black">
                            {match.home_score ?? "-"}
                          </p>

                          <p className="text-lg font-black">
                            {match.away_ref}
                          </p>
                          <p className="text-center text-2xl font-black">
                            {match.away_score ?? "-"}
                          </p>
                        </div>

                        <p
                          className={`mt-3 text-sm font-semibold ${
                            fase === "Final"
                              ? "text-red-100"
                              : "text-slate-500"
                          }`}
                        >
                          {match.match_date ?? "Fecha pendiente"} ·{" "}
                          {match.match_time ?? "Hora pendiente"} ·{" "}
                          {match.field ?? "Campo pendiente"}
                        </p>

                        <span
                          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${
                            match.status === "Finalizado"
                              ? "bg-emerald-100 text-emerald-700"
                              : fase === "Final"
                                ? "bg-white/20 text-white"
                                : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {match.status}
                        </span>
                      </div>
                    ))}
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