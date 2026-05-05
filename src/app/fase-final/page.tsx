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
  home_penalties: number | null;
  away_penalties: number | null;
  status: string;
  sort_order: number;
  mvp_open: boolean | null;
};

type Vote = {
  id: string;
  match_id: string;
  user_id: string;
};

function getUserId() {
  let userId = localStorage.getItem("torneo_user_id");

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("torneo_user_id", userId);
  }

  return userId;
}

export default function FaseFinalPage() {
  const [matches, setMatches] = useState<FinalMatch[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [faseAbierta, setFaseAbierta] = useState("");

  useEffect(() => {
    const usuario = getUserId();
    setUserId(usuario);
    cargarCruces(usuario);
  }, []);

  async function cargarCruces(usuario: string) {
    const { data, error } = await supabase
      .from("final_matches")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!error) {
      setMatches(data ?? []);
    }

    const { data: votesData } = await supabase
      .from("mvp_votes")
      .select("id, match_id, user_id")
      .eq("user_id", usuario);

    setVotes((votesData ?? []) as Vote[]);
    setLoading(false);
  }

  function votosUsuarioEnPartido(matchId: string) {
    return votes.filter(
      (vote) => vote.match_id === matchId && vote.user_id === userId
    ).length;
  }

  const fases = ["Cuartos", "Semifinales", "Tercer puesto", "Final"];

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
          <h1 className="mt-2 text-center text-3xl font-black">
            Eliminatorias
          </h1>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando fase final...
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {fases.map((fase) => {
              const cruces = matches.filter((match) => match.phase === fase);
              const abierta = faseAbierta === fase;

              return (
                <div
                  key={fase}
                  className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur"
                >
                  <button
                    onClick={() => setFaseAbierta(abierta ? "" : fase)}
                    className={`flex w-full items-center justify-between px-5 py-4 text-left ${
                      fase === "Final"
                        ? "bg-red-600 text-white"
                        : "bg-slate-950 text-white"
                    }`}
                  >
                    <div>
                      <p className="text-xl font-black">{fase}</p>
                    </div>

                    <span className="text-3xl font-black">
                      {abierta ? "−" : "+"}
                    </span>
                  </button>

                  {abierta && (
                    <div className="space-y-3 p-4">
                      {cruces.length === 0 ? (
                        <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                          Todavía no hay cruces configurados.
                        </p>
                      ) : (
                        cruces.map((match) => {
                          const finalizado = match.status === "Finalizado";
                          const hayPenaltis =
                            match.home_penalties !== null &&
                            match.away_penalties !== null;

                          const votosEmitidos = votosUsuarioEnPartido(match.id);
                          const votoCompleto = votosEmitidos >= 2;

                          return (
                            <div
                              key={match.id}
                              className={`rounded-2xl p-4 shadow ${
                                fase === "Final"
                                  ? "bg-red-50 ring-1 ring-red-100"
                                  : "bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-black uppercase text-red-600">
                                  {match.title}
                                </p>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-black ${
                                    finalizado
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {match.status}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-[1fr_52px] items-center gap-3">
                                <p className="text-lg font-black leading-tight">
                                  {match.home_ref}
                                </p>
                                <p className="rounded-xl bg-slate-950 py-2 text-center text-2xl font-black text-white">
                                  {match.home_score ?? "-"}
                                </p>

                                <p className="text-lg font-black leading-tight">
                                  {match.away_ref}
                                </p>
                                <p className="rounded-xl bg-slate-950 py-2 text-center text-2xl font-black text-white">
                                  {match.away_score ?? "-"}
                                </p>
                              </div>

                              {hayPenaltis && (
                                <div className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-center text-sm font-black text-amber-800">
                                  Penaltis: {match.home_penalties} -{" "}
                                  {match.away_penalties}
                                </div>
                              )}

                              {match.mvp_open && votoCompleto && (
                                <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-3 text-center text-sm font-black text-emerald-800">
                                  ✅ Voto emitido
                                </div>
                              )}

                              {match.mvp_open && !votoCompleto && (
                                <a
                                  href={`/votar-mvp?match=${match.id}`}
                                  className="mt-3 block rounded-xl bg-red-600 px-3 py-3 text-center text-sm font-black text-white shadow"
                                >
                                  Votar MVP de este partido
                                </a>
                              )}

                              <p className="mt-4 text-sm font-semibold text-slate-500">
                                {match.match_date ?? "Fecha pendiente"} ·{" "}
                                {match.match_time ?? "Hora pendiente"} ·{" "}
                                {match.field ?? "Campo pendiente"}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}