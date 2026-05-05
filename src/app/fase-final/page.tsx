"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

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
  status: string | null;
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

function estadoBonito(status: string | null) {
  if (!status) return "Pendiente";

  if (status === "pending") return "Pendiente";
  if (status === "live") return "En juego";
  if (status === "finished") return "Finalizado";
  if (status === "closed") return "Cerrado";

  return status;
}

function estaFinalizado(status: string | null) {
  const estado = estadoBonito(status).toLowerCase();

  return estado === "finalizado" || estado === "cerrado";
}

export default function FaseFinalPage() {
  const [matches, setMatches] = useState<FinalMatch[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [faseAbierta, setFaseAbierta] = useState("");

  useEffect(() => {
    const usuario = getUserId();
    setUserId(usuario);
    cargarCruces(usuario);
  }, []);

  async function cargarCruces(usuario: string) {
    setLoading(true);
    setErrorCarga("");

    const { data, error } = await supabase
      .from("final_matches")
      .select("*")
      .order("sort_order", { ascending: true });

    const { data: votesData, error: votesError } = await supabase
      .from("mvp_votes")
      .select("id, match_id, user_id")
      .eq("user_id", usuario);

    if (error || votesError) {
      setErrorCarga("No se ha podido cargar la fase final.");
      setLoading(false);
      return;
    }

    const cruces = (data ?? []) as FinalMatch[];

    setMatches(cruces);
    setVotes((votesData ?? []) as Vote[]);

    if (cruces.length > 0) {
      setFaseAbierta(cruces[0].phase);
    }

    setLoading(false);
  }

  const fases = useMemo(() => {
    const ordenPreferido = ["Cuartos", "Semifinales", "Tercer puesto", "Final"];

    const fasesReales = Array.from(
      new Set(matches.map((match) => match.phase).filter(Boolean))
    );

    return fasesReales.sort((a, b) => {
      const indexA = ordenPreferido.indexOf(a);
      const indexB = ordenPreferido.indexOf(b);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return a.localeCompare(b);
    });
  }, [matches]);

  function votosUsuarioEnPartido(matchId: string) {
    return votes.filter(
      (vote) => vote.match_id === matchId && vote.user_id === userId
    ).length;
  }

  function renderEstadoMvp(match: FinalMatch) {
    if (!match.mvp_open) return null;

    const votosEmitidos = votosUsuarioEnPartido(match.id);

    if (votosEmitidos >= 2) {
      return (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-3 text-center text-sm font-black text-emerald-800">
          ✅ Voto emitido
        </div>
      );
    }

    if (votosEmitidos === 1) {
      return (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-3 text-center text-sm font-black text-emerald-800">
          ✅ Voto iniciado
        </div>
      );
    }

    return (
      <Link
        href={`/votar-mvp?match=${match.id}`}
        className="mt-3 block rounded-xl bg-red-600 px-3 py-3 text-center text-sm font-black text-white shadow"
      >
        Votar MVP de este partido
      </Link>
    );
  }

  function renderFecha(match: FinalMatch) {
    const fecha = match.match_date
      ? formatearFecha(match.match_date)
      : "Fecha pendiente";

    const hora = match.match_time ?? "Hora pendiente";
    const campo = match.field ?? "Campo pendiente";

    return `${fecha} · ${hora} · ${campo}`;
  }

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
        ) : errorCarga ? (
          <div className="mt-6 rounded-2xl bg-red-100 p-5 font-bold text-red-700 shadow">
            {errorCarga}
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Todavía no hay eliminatorias configuradas.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {fases.map((fase) => {
              const cruces = matches.filter((match) => match.phase === fase);
              const abierta = faseAbierta === fase;
              const esFinal = fase.toLowerCase() === "final";

              return (
                <div
                  key={fase}
                  className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur"
                >
                  <button
                    onClick={() => setFaseAbierta(abierta ? "" : fase)}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left ${
                      esFinal ? "bg-red-600 text-white" : "bg-slate-950 text-white"
                    }`}
                  >
                    <div>
                      <p className="text-xl font-black">{fase}</p>
                      <p
                        className={`text-xs font-bold ${
                          esFinal ? "text-red-100" : "text-slate-300"
                        }`}
                      >
                        {cruces.length} partido{cruces.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <span className="shrink-0 text-3xl font-black">
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
                          const finalizado = estaFinalizado(match.status);
                          const hayResultado =
                            match.home_score !== null &&
                            match.away_score !== null;
                          const hayPenaltis =
                            match.home_penalties !== null &&
                            match.away_penalties !== null;

                          return (
                            <div
                              key={match.id}
                              className={`rounded-2xl p-4 shadow ${
                                esFinal
                                  ? "bg-red-50 ring-1 ring-red-100"
                                  : "bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="break-words text-sm font-black uppercase text-red-600">
                                  {match.title}
                                </p>

                                <span
                                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                                    finalizado
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {estadoBonito(match.status)}
                                </span>
                              </div>

                              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                                <div className="grid grid-cols-[1fr_58px] items-center gap-3">
                                  <p className="break-words text-lg font-black leading-tight">
                                    {match.home_ref}
                                  </p>

                                  <p className="rounded-xl bg-slate-950 py-2 text-center text-2xl font-black text-white">
                                    {hayResultado ? match.home_score : "-"}
                                  </p>

                                  <p className="break-words text-lg font-black leading-tight">
                                    {match.away_ref}
                                  </p>

                                  <p className="rounded-xl bg-slate-950 py-2 text-center text-2xl font-black text-white">
                                    {hayResultado ? match.away_score : "-"}
                                  </p>
                                </div>

                                {hayPenaltis && (
                                  <div className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-center text-sm font-black text-amber-800">
                                    Penaltis: {match.home_penalties} -{" "}
                                    {match.away_penalties}
                                  </div>
                                )}
                              </div>

                              {renderEstadoMvp(match)}

                              <p className="mt-4 text-sm font-semibold text-slate-500">
                                {renderFecha(match)}
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