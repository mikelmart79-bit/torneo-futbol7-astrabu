"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  status: string | null;
  sort_order: number;
};

const FASES_ORDENADAS = [
  "Octavos",
  "Cuartos",
  "Semifinales",
  "Tercer puesto",
  "Final",
];

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function estadoPermiteVerActa(status: string | null | undefined) {
  const estado = normalizarTexto(status);
  return estado === "finalizado" || estado === "cerrado";
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";

  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year}`;
}

function colorFase(phase: string) {
  const limpio = normalizarTexto(phase);

  if (limpio === "final") {
    return "bg-yellow-400 text-slate-950";
  }

  if (limpio === "tercer puesto") {
    return "bg-emerald-600 text-white";
  }

  return "bg-red-600 text-white";
}

function nombreFaseVisible(phase: string) {
  if (normalizarTexto(phase) === "tercer puesto") {
    return "Tercer y cuarto puesto";
  }

  return phase;
}

function ordenarFases(a: string, b: string) {
  const indexA = FASES_ORDENADAS.indexOf(a);
  const indexB = FASES_ORDENADAS.indexOf(b);

  const valorA = indexA === -1 ? 999 : indexA;
  const valorB = indexB === -1 ? 999 : indexB;

  return valorA - valorB;
}

function resultadoTexto(match: FinalMatch) {
  const base = `${match.home_score ?? "-"} - ${match.away_score ?? "-"}`;

  if (
    match.home_penalties !== null &&
    match.away_penalties !== null &&
    (normalizarTexto(match.phase) === "final" ||
      normalizarTexto(match.phase) === "semifinales" ||
      normalizarTexto(match.phase) === "cuartos" ||
      normalizarTexto(match.phase) === "octavos")
  ) {
    return `${base} · Pen. ${match.home_penalties}-${match.away_penalties}`;
  }

  return base;
}

function BracketCard({
  match,
  compact = false,
}: {
  match?: FinalMatch;
  compact?: boolean;
}) {
  if (!match) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-400 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-widest">
          Pendiente
        </p>
        <p className="mt-2 text-sm font-bold">Cruce sin definir</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-md ring-1 ring-slate-200">
      <p className="text-[11px] font-black uppercase tracking-widest text-red-600">
        {match.title}
      </p>

      <div className="mt-2 space-y-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="break-words text-sm font-black text-slate-900">
            {match.home_ref || "Por definir"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="break-words text-sm font-black text-slate-900">
            {match.away_ref || "Por definir"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            estadoPermiteVerActa(match.status)
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {match.home_score !== null || match.away_score !== null
            ? resultadoTexto(match)
            : "Pendiente"}
        </span>

        {!compact && (
          <span className="text-[11px] font-bold text-slate-500">
            {formatearFecha(match.match_date)}
          </span>
        )}
      </div>
    </div>
  );
}

function PartidoCard({ match }: { match: FinalMatch }) {
  return (
    <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${colorFase(
              match.phase
            )}`}
          >
            {match.phase}
          </span>

          <h3 className="mt-3 text-xl font-black text-slate-950">
            {match.title}
          </h3>
        </div>

        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-white shadow">
          <p className="text-lg font-black text-red-400">
            {match.home_score ?? "-"} - {match.away_score ?? "-"}
          </p>

          {match.home_penalties !== null && match.away_penalties !== null && (
            <p className="mt-1 text-[11px] font-bold text-slate-300">
              Pen. {match.home_penalties}-{match.away_penalties}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-100 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Local
          </p>
          <p className="mt-2 break-words text-lg font-black text-slate-950">
            {match.home_ref || "Por definir"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-100 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Visitante
          </p>
          <p className="mt-2 break-words text-lg font-black text-slate-950">
            {match.away_ref || "Por definir"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-black uppercase text-slate-500">Fecha</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {formatearFecha(match.match_date)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-black uppercase text-slate-500">Hora</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {match.match_time ?? "--:--"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-black uppercase text-slate-500">Campo</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {match.field ?? "Pendiente"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {estadoPermiteVerActa(match.status) && (
          <Link
            href={`/acta-partido?match=${match.id}&type=final`}
            className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black uppercase text-white shadow"
          >
            Ver acta
          </Link>
        )}

        <div className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-700">
          Estado: {match.status ?? "Pendiente"}
        </div>
      </div>
    </div>
  );
}

export default function FaseFinalPage() {
  const [matches, setMatches] = useState<FinalMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    async function cargarEliminatorias() {
      setLoading(true);
      setErrorCarga("");

      const { data, error } = await supabase
        .from("final_matches")
        .select(
          "id, phase, title, home_ref, away_ref, match_date, match_time, field, home_score, away_score, home_penalties, away_penalties, status, sort_order"
        )
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error cargando eliminatorias:", error);
        setErrorCarga("No se han podido cargar las eliminatorias.");
        setLoading(false);
        return;
      }

      setMatches((data ?? []) as FinalMatch[]);
      setLoading(false);
    }

    cargarEliminatorias();
  }, []);

  const agrupados = useMemo(() => {
    const mapa = new Map<string, FinalMatch[]>();

    matches.forEach((match) => {
      const fase = match.phase || "Otros";

      if (!mapa.has(fase)) {
        mapa.set(fase, []);
      }

      mapa.get(fase)!.push(match);
    });

    return Array.from(mapa.entries()).sort((a, b) => ordenarFases(a[0], b[0]));
  }, [matches]);

  const matchByTitle = useMemo(() => {
    const map = new Map<string, FinalMatch>();

    matches.forEach((match) => {
      map.set(match.title, match);
    });

    return map;
  }, [matches]);

  const oct1 = matchByTitle.get("Octavo 1");
  const oct2 = matchByTitle.get("Octavo 2");
  const oct3 = matchByTitle.get("Octavo 3");
  const oct4 = matchByTitle.get("Octavo 4");
  const oct5 = matchByTitle.get("Octavo 5");
  const oct6 = matchByTitle.get("Octavo 6");
  const oct7 = matchByTitle.get("Octavo 7");
  const oct8 = matchByTitle.get("Octavo 8");

  const cua1 = matchByTitle.get("Cuarto 1");
  const cua2 = matchByTitle.get("Cuarto 2");
  const cua3 = matchByTitle.get("Cuarto 3");
  const cua4 = matchByTitle.get("Cuarto 4");

  const semi1 = matchByTitle.get("Semifinal 1");
  const semi2 = matchByTitle.get("Semifinal 2");

  const tercerPuesto = matchByTitle.get("Tercer y cuarto puesto");
  const final = matchByTitle.get("Final");

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-6 pb-24">
        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>

          <h1 className="mt-2 text-center text-3xl font-black">
            Eliminatorias
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Cuadro final del torneo
          </p>
        </div>

        <Link
          href="/inicio"
          className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
        >
          Volver al inicio
        </Link>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
            Cargando eliminatorias...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 font-bold text-red-700 shadow-2xl">
            {errorCarga}
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl">
            <p className="font-bold text-slate-500">
              Todavía no hay eliminatorias creadas.
            </p>
          </div>
        ) : (
          <>
            {/* CUADRO VISUAL */}
            <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-red-600">
                    Cuadro de eliminatorias
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-600">
                    Vista tipo Mundial hasta la final
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto pb-2">
                <div className="min-w-[1320px]">
                  <div className="grid grid-cols-7 gap-4">
                    {/* Columna 1 - Octavos izquierda */}
                    <div>
                      <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Octavos
                      </p>
                      <div className="space-y-4">
                        <BracketCard match={oct1} compact />
                        <BracketCard match={oct2} compact />
                        <BracketCard match={oct3} compact />
                        <BracketCard match={oct4} compact />
                      </div>
                    </div>

                    {/* Columna 2 - Cuartos izquierda */}
                    <div className="pt-12">
                      <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Cuartos
                      </p>
                      <div className="space-y-20">
                        <BracketCard match={cua1} compact />
                        <BracketCard match={cua2} compact />
                      </div>
                    </div>

                    {/* Columna 3 - Semi izquierda */}
                    <div className="pt-32">
                      <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Semifinal
                      </p>
                      <BracketCard match={semi1} compact />
                    </div>

                    {/* Columna 4 - Centro */}
                    <div className="pt-20">
                      <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Final
                      </p>
                      <BracketCard match={final} />

                      <p className="mb-3 mt-8 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        3er puesto
                      </p>
                      <BracketCard match={tercerPuesto} />
                    </div>

                    {/* Columna 5 - Semi derecha */}
                    <div className="pt-32">
                      <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Semifinal
                      </p>
                      <BracketCard match={semi2} compact />
                    </div>

                    {/* Columna 6 - Cuartos derecha */}
                    <div className="pt-12">
                      <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Cuartos
                      </p>
                      <div className="space-y-20">
                        <BracketCard match={cua3} compact />
                        <BracketCard match={cua4} compact />
                      </div>
                    </div>

                    {/* Columna 7 - Octavos derecha */}
                    <div>
                      <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Octavos
                      </p>
                      <div className="space-y-4">
                        <BracketCard match={oct5} compact />
                        <BracketCard match={oct6} compact />
                        <BracketCard match={oct7} compact />
                        <BracketCard match={oct8} compact />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LISTADO POR FASES */}
            <div className="mt-6 space-y-6">
              {agrupados.map(([fase, partidos]) => (
                <div key={fase}>
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`rounded-full px-4 py-2 text-sm font-black uppercase ${colorFase(
                        fase
                      )}`}
                    >
                      {nombreFaseVisible(fase)}
                    </div>

                    <div className="h-px flex-1 bg-white/30" />
                  </div>

                  <div className="space-y-4">
                    {partidos.map((match) => (
                      <PartidoCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}