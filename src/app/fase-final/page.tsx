"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
};

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

function normalizar(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function estadoColor(estado: string | null) {
  const valor = normalizar(estado);

  if (valor === "cerrado") return "bg-slate-950 text-white";
  if (valor === "finalizado") return "bg-emerald-100 text-emerald-800";
  if (valor === "en juego") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-600";
}

function tieneResultado(match: FinalMatch) {
  return match.home_score !== null && match.away_score !== null;
}

function textoResultado(match: FinalMatch) {
  if (!tieneResultado(match)) return "-";

  const resultado = `${match.home_score} - ${match.away_score}`;

  if (match.home_penalties !== null && match.away_penalties !== null) {
    return `${resultado} · pen. ${match.home_penalties}-${match.away_penalties}`;
  }

  return resultado;
}

function ganador(match: FinalMatch) {
  if (match.home_score === null || match.away_score === null) return "";

  if (match.home_score > match.away_score) return match.home_ref;
  if (match.away_score > match.home_score) return match.away_ref;

  if (match.home_penalties !== null && match.away_penalties !== null) {
    if (match.home_penalties > match.away_penalties) return match.home_ref;
    if (match.away_penalties > match.home_penalties) return match.away_ref;
  }

  return "";
}

function partidoCard(match: FinalMatch) {
  const ganadorNombre = ganador(match);

  return (
    <div key={match.id} className="rounded-2xl bg-slate-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase text-red-600">
            {match.title}
          </p>

          <div className="mt-2 space-y-1">
            <p
              className={`break-words font-black leading-tight ${
                ganadorNombre === match.home_ref ? "text-emerald-700" : ""
              }`}
            >
              {match.home_ref}
            </p>

            <p
              className={`break-words font-black leading-tight ${
                ganadorNombre === match.away_ref ? "text-emerald-700" : ""
              }`}
            >
              {match.away_ref}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-center text-white">
          <p className="text-lg font-black">{textoResultado(match)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${estadoColor(
            match.status
          )}`}
        >
          {match.status ?? "Pendiente"}
        </span>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
          {formatearFechaSegura(match.match_date)}
        </span>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
          {match.match_time ?? "Hora pendiente"}
        </span>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
          {match.field ?? "Campo pendiente"}
        </span>
      </div>
    </div>
  );
}

function bracketBox(match: FinalMatch | undefined, destacado = false) {
  if (!match) {
    return (
      <div className="min-h-[96px] rounded-2xl border border-dashed border-slate-300 bg-white/80 p-3 text-sm font-bold text-slate-400">
        Pendiente
      </div>
    );
  }

  const ganadorNombre = ganador(match);

  return (
    <div
      className={`min-h-[96px] rounded-2xl p-3 shadow ${
        destacado ? "bg-yellow-50 ring-2 ring-yellow-300" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={`text-[10px] font-black uppercase ${
            destacado ? "text-yellow-700" : "text-red-600"
          }`}
        >
          {match.title}
        </p>

        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${estadoColor(
            match.status
          )}`}
        >
          {match.status ?? "Pendiente"}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`min-w-0 break-words font-black ${
              ganadorNombre === match.home_ref ? "text-emerald-700" : ""
            }`}
          >
            {match.home_ref}
          </p>

          <span className="font-black">{match.home_score ?? "-"}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={`min-w-0 break-words font-black ${
              ganadorNombre === match.away_ref ? "text-emerald-700" : ""
            }`}
          >
            {match.away_ref}
          </p>

          <span className="font-black">{match.away_score ?? "-"}</span>
        </div>
      </div>

      {(match.home_penalties !== null || match.away_penalties !== null) && (
        <p className="mt-2 text-[10px] font-bold text-slate-500">
          Penaltis: {match.home_penalties ?? "-"} -{" "}
          {match.away_penalties ?? "-"}
        </p>
      )}

      <p className="mt-2 text-[10px] font-bold text-slate-500">
        {formatearFechaSegura(match.match_date)} ·{" "}
        {match.match_time ?? "Hora pendiente"}
      </p>
    </div>
  );
}

function ConnectorFourToTwo() {
  return (
    <div className="pt-[34px]">
      <div className="space-y-[122px]">
        {[0, 1].map((item) => (
          <div key={item} className="relative h-[98px]">
            <div className="absolute left-0 top-[24px] h-px w-full bg-slate-300" />
            <div className="absolute left-0 bottom-[24px] h-px w-full bg-slate-300" />
            <div className="absolute right-0 top-[24px] h-[50px] w-px bg-slate-300" />
            <div className="absolute right-0 top-[49px] h-px w-full bg-slate-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectorTwoToOne() {
  return (
    <div className="pt-[84px]">
      <div className="relative h-[220px]">
        <div className="absolute left-0 top-[24px] h-px w-full bg-slate-300" />
        <div className="absolute left-0 bottom-[24px] h-px w-full bg-slate-300" />
        <div className="absolute right-0 top-[24px] h-[172px] w-px bg-slate-300" />
        <div className="absolute right-0 top-[110px] h-px w-full bg-slate-300" />
      </div>
    </div>
  );
}

function ConnectorSemiToFinal({ side }: { side: "left" | "right" }) {
  return (
    <div className="pt-[178px]">
      <div className="relative h-[120px]">
        <div
          className={`absolute top-[56px] h-px w-full bg-slate-300 ${
            side === "left" ? "left-0" : "right-0"
          }`}
        />
      </div>
    </div>
  );
}

function Accordion({
  title,
  subtitle,
  abierto,
  onToggle,
  children,
  variant = "red",
}: {
  title: string;
  subtitle?: string;
  abierto: boolean;
  onToggle: () => void;
  children: ReactNode;
  variant?: "red" | "green" | "gold";
}) {
  const colorClass =
    variant === "green"
      ? "bg-emerald-600 text-white"
      : variant === "gold"
      ? "bg-yellow-400 text-slate-950"
      : "bg-red-600 text-white";

  const subtitleClass =
    variant === "gold" ? "text-yellow-900" : "text-white/85";

  return (
    <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
      <button
        onClick={onToggle}
        className={`flex w-full items-center justify-between px-5 py-4 text-left ${colorClass}`}
      >
        <div>
          <p className="text-lg font-black">{title}</p>

          {subtitle && (
            <p className={`text-sm font-bold ${subtitleClass}`}>{subtitle}</p>
          )}
        </div>

        <span className="text-3xl font-black">{abierto ? "−" : "+"}</span>
      </button>

      {abierto && <div className="space-y-3 p-4">{children}</div>}
    </div>
  );
}

export default function FaseFinalPage() {
  const [matches, setMatches] = useState<FinalMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [cuadroAbierto, setCuadroAbierto] = useState(false);
  const [octavosAbierto, setOctavosAbierto] = useState(false);
  const [cuartosAbierto, setCuartosAbierto] = useState(false);
  const [semisAbierto, setSemisAbierto] = useState(false);
  const [tercerAbierto, setTercerAbierto] = useState(false);
  const [finalAbierto, setFinalAbierto] = useState(false);

  useEffect(() => {
    async function cargarEliminatorias() {
      setLoading(true);
      setErrorCarga("");

      const { data, error } = await supabase
        .from("final_matches")
        .select(
          `
          id,
          phase,
          title,
          home_ref,
          away_ref,
          match_date,
          match_time,
          field,
          home_score,
          away_score,
          home_penalties,
          away_penalties,
          status,
          sort_order
        `
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

  const octavos = useMemo(
    () => matches.filter((match) => normalizar(match.phase) === "octavos"),
    [matches]
  );

  const cuartos = useMemo(
    () => matches.filter((match) => normalizar(match.phase) === "cuartos"),
    [matches]
  );

  const semifinales = useMemo(
    () =>
      matches.filter(
        (match) =>
          normalizar(match.phase) === "semifinales" ||
          normalizar(match.phase) === "semis"
      ),
    [matches]
  );

  const tercerPuesto = useMemo(
    () =>
      matches.filter(
        (match) =>
          normalizar(match.phase) === "tercer puesto" ||
          normalizar(match.title).includes("tercer")
      ),
    [matches]
  );

  const final = useMemo(
    () =>
      matches.filter(
        (match) =>
          normalizar(match.phase) === "final" &&
          !normalizar(match.title).includes("tercer")
      ),
    [matches]
  );

  const octavosIzquierda = octavos.slice(0, 4);
  const octavosDerecha = octavos.slice(4, 8);

  const cuartosIzquierda = cuartos.slice(0, 2);
  const cuartosDerecha = cuartos.slice(2, 4);

  const semiIzquierda = semifinales[0];
  const semiDerecha = semifinales[1];

  const finalMatch = final[0];
  const tercerPuestoMatch = tercerPuesto[0];

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
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
            Cargando eliminatorias...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 font-bold text-red-700 shadow-2xl">
            {errorCarga}
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold text-slate-500 shadow-2xl">
            Todavía no hay eliminatorias configuradas.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <Accordion
              title="Cuadro de eliminatorias"
              subtitle="Vista completa hasta la final"
              abierto={cuadroAbierto}
              onToggle={() => setCuadroAbierto(!cuadroAbierto)}
              variant="green"
            >
              <div className="overflow-x-auto pb-2">
                <div className="grid min-w-[1180px] grid-cols-[1.25fr_44px_1.05fr_44px_1.05fr_44px_1.15fr_44px_1.05fr_44px_1.05fr_44px_1.25fr] items-start gap-0">
                  <div className="space-y-3">
                    <p className="text-center text-xs font-black uppercase text-slate-500">
                      Octavos
                    </p>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`oct-left-${index}`}>
                        {bracketBox(octavosIzquierda[index])}
                      </div>
                    ))}
                  </div>

                  <ConnectorFourToTwo />

                  <div className="space-y-[122px] pt-[49px]">
                    <p className="text-center text-xs font-black uppercase text-slate-500">
                      Cuartos
                    </p>
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={`cua-left-${index}`}>
                        {bracketBox(cuartosIzquierda[index])}
                      </div>
                    ))}
                  </div>

                  <ConnectorTwoToOne />

                  <div className="pt-[210px]">
                    <p className="mb-3 text-center text-xs font-black uppercase text-slate-500">
                      Semis
                    </p>
                    {bracketBox(semiIzquierda)}
                  </div>

                  <ConnectorSemiToFinal side="left" />

                  <div className="pt-[168px]">
                    <p className="mb-3 text-center text-xs font-black uppercase text-slate-500">
                      Final
                    </p>
                    {bracketBox(finalMatch, true)}

                    <p className="mb-3 mt-10 text-center text-xs font-black uppercase text-slate-500">
                      3er / 4º puesto
                    </p>
                    {bracketBox(tercerPuestoMatch)}
                  </div>

                  <ConnectorSemiToFinal side="right" />

                  <div className="pt-[210px]">
                    <p className="mb-3 text-center text-xs font-black uppercase text-slate-500">
                      Semis
                    </p>
                    {bracketBox(semiDerecha)}
                  </div>

                  <ConnectorTwoToOne />

                  <div className="space-y-[122px] pt-[49px]">
                    <p className="text-center text-xs font-black uppercase text-slate-500">
                      Cuartos
                    </p>
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={`cua-right-${index}`}>
                        {bracketBox(cuartosDerecha[index])}
                      </div>
                    ))}
                  </div>

                  <ConnectorFourToTwo />

                  <div className="space-y-3">
                    <p className="text-center text-xs font-black uppercase text-slate-500">
                      Octavos
                    </p>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`oct-right-${index}`}>
                        {bracketBox(octavosDerecha[index])}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Accordion>

            <Accordion
              title="Octavos"
              abierto={octavosAbierto}
              onToggle={() => setOctavosAbierto(!octavosAbierto)}
              variant="red"
            >
              {octavos.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                  Todavía no hay octavos configurados.
                </p>
              ) : (
                octavos.map((match) => partidoCard(match))
              )}
            </Accordion>

            <Accordion
              title="Cuartos"
              abierto={cuartosAbierto}
              onToggle={() => setCuartosAbierto(!cuartosAbierto)}
              variant="red"
            >
              {cuartos.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                  Todavía no hay cuartos configurados.
                </p>
              ) : (
                cuartos.map((match) => partidoCard(match))
              )}
            </Accordion>

            <Accordion
              title="Semifinales"
              abierto={semisAbierto}
              onToggle={() => setSemisAbierto(!semisAbierto)}
              variant="red"
            >
              {semifinales.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                  Todavía no hay semifinales configuradas.
                </p>
              ) : (
                semifinales.map((match) => partidoCard(match))
              )}
            </Accordion>

            <Accordion
              title="Tercer puesto"
              abierto={tercerAbierto}
              onToggle={() => setTercerAbierto(!tercerAbierto)}
              variant="red"
            >
              {tercerPuesto.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                  Todavía no hay partido de tercer puesto configurado.
                </p>
              ) : (
                tercerPuesto.map((match) => partidoCard(match))
              )}
            </Accordion>

            <Accordion
              title="Final"
              abierto={finalAbierto}
              onToggle={() => setFinalAbierto(!finalAbierto)}
              variant="gold"
            >
              {final.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
                  Todavía no hay final configurada.
                </p>
              ) : (
                final.map((match) => partidoCard(match))
              )}
            </Accordion>
          </div>
        )}
      </section>
    </main>
  );
}