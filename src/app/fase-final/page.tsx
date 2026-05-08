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
  match_id: string | null;
  final_match_id: string | null;
  user_id: string;
};

const ORDEN_FASES = [
  "Octavos",
  "Cuartos",
  "Semifinales",
  "Tercer puesto",
  "Final",
];

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

function normalizarFase(fase: string) {
  if (fase === "Tercer Y cuarto puesto") return "Tercer puesto";
  if (fase === "Tercer y cuarto puesto") return "Tercer puesto";
  return fase;
}

function ordenarFases(matches: FinalMatch[]) {
  const fasesReales = Array.from(
    new Set(matches.map((match) => normalizarFase(match.phase)).filter(Boolean))
  );

  return fasesReales.sort((a, b) => {
    const indexA = ORDEN_FASES.indexOf(a);
    const indexB = ORDEN_FASES.indexOf(b);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return a.localeCompare(b);
  });
}

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
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
      .select("id, match_id, final_match_id, user_id")
      .eq("user_id", usuario);

    if (error || votesError) {
      console.error("Error cargando eliminatorias:", error || votesError);
      setErrorCarga("No se han podido cargar las eliminatorias.");
      setLoading(false);
      return;
    }

    setMatches((data ?? []) as FinalMatch[]);
    setVotes((votesData ?? []) as Vote[]);
    setFaseAbierta("");
    setLoading(false);
  }

  const fases = useMemo(() => ordenarFases(matches), [matches]);

  function votosUsuarioEnEliminatoria(finalMatchId: string) {
    return votes.filter(
      (vote) => vote.final_match_id === finalMatchId && vote.user_id === userId
    ).length;
  }

  function renderEstadoMvp(match: FinalMatch) {
    if (!match.mvp_open) return null;

    const votosEmitidos = votosUsuarioEnEliminatoria(match.id);

    if (votosEmitidos > 0) {
      return (
        <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-800">
          ✅ Voto emitido
        </div>
      );
    }

    return (
      <Link
        href={`/votar-mvp?match=${match.id}&type=final`}
        className="mt-3 block rounded-xl bg-red-700 px-3 py-2 text-center text-sm font-black text-white shadow"
      >
        Votar MVP de este partido
      </Link>
    );
  }

  function renderFecha(match: FinalMatch) {
    const fecha = formatearFechaSegura(match.match_date);
    const hora = match.match_time ?? "Hora pendiente";
    const campo = match.field ?? "Campo pendiente";

    return `${fecha} · ${hora} · ${campo}`;
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-36">
        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>

          <h1 className="mt-2 text-center text-3xl font-black">
            Eliminatorias
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Octavos, cuartos, semifinales y final
          </p>
        </div>

        <Link
          href="/inicio"
          className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
        >
          Volver al inicio
        </Link>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando eliminatorias...
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
          <div className="mt-6 space-y-3">
            {fases.map((fase) => {
              const cruces = matches.filter(
                (match) => normalizarFase(match.phase) === fase
              );

              const abierta = faseAbierta === fase;
              const esFinal = fase.toLowerCase() === "final";

              return (
                <div
                  key={fase}
                  className={`overflow-hidden rounded-3xl shadow-2xl backdrop-blur ${
                    esFinal ? "bg-amber-100/95" : "bg-red-900/80"
                  }`}
                >
                  <button
                    onClick={() => setFaseAbierta(abierta ? "" : fase)}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left ${
                      esFinal
                        ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950"
                        : "bg-red-800/90 text-white"
                    }`}
                  >
                    <p className="break-words text-xl font-black leading-tight">
                      {esFinal ? "🏆 Final" : fase}
                    </p>

                    <span className="shrink-0 text-2xl font-black">
                      {abierta ? "−" : "+"}
                    </span>
                  </button>

                  {abierta && (
                    <div
                      className={`space-y-3 p-3 ${
                        esFinal ? "bg-amber-50" : "bg-red-50"
                      }`}
                    >
                      {cruces.length === 0 ? (
                        <p className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
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
                            match.home_penalties !== undefined &&
                            match.away_penalties !== null &&
                            match.away_penalties !== undefined;

                          return (
                            <div
                              key={match.id}
                              className={`rounded-2xl p-3 shadow ${
                                esFinal
                                  ? "bg-white ring-1 ring-amber-200"
                                  : "bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p
                                  className={`break-words text-xs font-black uppercase tracking-wide ${
                                    esFinal
                                      ? "text-amber-700"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {match.title}
                                </p>

                                <span
                                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${
                                    finalizado
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {estadoBonito(match.status)}
                                </span>
                              </div>

                              <div className="mt-3 rounded-2xl bg-slate-50 p-3 shadow-sm">
                                <div className="grid grid-cols-[1fr_52px] items-center gap-3">
                                  <p className="break-words text-base font-black leading-tight">
                                    {match.home_ref}
                                  </p>

                                  <p className="rounded-xl bg-slate-950 py-2 text-center text-xl font-black text-white">
                                    {hayResultado ? match.home_score : "-"}
                                  </p>

                                  <p className="break-words text-base font-black leading-tight">
                                    {match.away_ref}
                                  </p>

                                  <p className="rounded-xl bg-slate-950 py-2 text-center text-xl font-black text-white">
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

                              <p className="mt-3 text-sm font-semibold text-slate-500">
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