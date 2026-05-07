"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Match = {
  id: string;
  tipo: "grupo" | "final";
  phase?: string | null;
  title?: string | null;
  group_name?: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type RawMatch = {
  id: string;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string }[] | { name: string } | null;
  away_team: { name: string }[] | { name: string } | null;
};

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
  sort_order: number;
};

function normalizarEquipo(
  equipo: RawMatch["home_team"]
): { name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function fechaLocalHoy() {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, "0");
  const day = String(ahora.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function horaLocalActual() {
  const ahora = new Date();
  const hours = String(ahora.getHours()).padStart(2, "0");
  const minutes = String(ahora.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function esPartidoProximo(partido: Match) {
  if (!partido.match_date || !partido.match_time) return false;

  const hoy = fechaLocalHoy();
  const horaActual = horaLocalActual();

  if (partido.match_date > hoy) return true;

  if (partido.match_date === hoy && partido.match_time >= horaActual) {
    return true;
  }

  return false;
}

function ordenarPartidos(partidos: Match[]) {
  return [...partidos].sort((a, b) => {
    const fechaA = a.match_date ?? "9999-12-31";
    const fechaB = b.match_date ?? "9999-12-31";

    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);

    const horaA = a.match_time ?? "99:99";
    const horaB = b.match_time ?? "99:99";

    return horaA.localeCompare(horaB);
  });
}

function nombreFaseBonito(partido: Match) {
  if (partido.tipo === "grupo") return partido.group_name ?? "Grupo";

  if (partido.phase === "Final") return partido.title ?? "Gran Final";

  if (partido.phase && partido.title) {
    return `${partido.phase} · ${partido.title}`;
  }

  return partido.phase ?? partido.title ?? "Eliminatoria";
}

export default function InicioPage() {
  const router = useRouter();

  const [partidos, setPartidos] = useState<Match[]>([]);
  const [indicePartido, setIndicePartido] = useState(0);
  const [toquesAdmin, setToquesAdmin] = useState(0);

  const partido = partidos[indicePartido] ?? null;

  useEffect(() => {
    async function cargarProximos() {
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`
          id,
          group_name,
          match_date,
          match_time,
          field,
          home_score,
          away_score,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true });

      const { data: finalData, error: finalError } = await supabase
        .from("final_matches")
        .select(`
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
          sort_order
        `)
        .order("sort_order", { ascending: true });

      if (matchesError || finalError) {
        setPartidos([]);
        setIndicePartido(0);
        return;
      }

      const partidosGrupo: Match[] = (
        (matchesData as unknown as RawMatch[]) || []
      ).map((match) => ({
        id: match.id,
        tipo: "grupo",
        group_name: match.group_name,
        match_date: match.match_date,
        match_time: match.match_time,
        field: match.field,
        home_score: match.home_score,
        away_score: match.away_score,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      }));

      const partidosFinales: Match[] = ((finalData ?? []) as FinalMatch[]).map(
        (match) => ({
          id: match.id,
          tipo: "final",
          phase: match.phase,
          title: match.title,
          group_name: null,
          match_date: match.match_date,
          match_time: match.match_time,
          field: match.field,
          home_score: match.home_score,
          away_score: match.away_score,
          home_team: match.home_ref
            ? { name: match.home_ref }
            : { name: "Local" },
          away_team: match.away_ref
            ? { name: match.away_ref }
            : { name: "Visitante" },
        })
      );

      const proximos = ordenarPartidos([
        ...partidosGrupo,
        ...partidosFinales,
      ]).filter(esPartidoProximo);

      setPartidos(proximos.slice(0, 20));
      setIndicePartido(0);
    }

    cargarProximos();
  }, []);

  function accesoAdminOculto() {
    setToquesAdmin((actual) => {
      const nuevo = actual + 1;

      if (nuevo >= 5) {
        router.push("/admin");
        return 0;
      }

      return nuevo;
    });
  }

  function anteriorPartido() {
    if (partidos.length <= 1) return;

    setIndicePartido((actual) =>
      actual === 0 ? partidos.length - 1 : actual - 1
    );
  }

  function siguientePartido() {
    if (partidos.length <= 1) return;

    setIndicePartido((actual) =>
      actual === partidos.length - 1 ? 0 : actual + 1
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-4 py-3 pb-4">
        <div className="rounded-3xl bg-black/60 px-4 py-4 text-white shadow-2xl backdrop-blur">
          <h1
            onClick={accesoAdminOculto}
            className="cursor-default select-none whitespace-nowrap text-center text-base font-black sm:text-lg"
          >
            Torneo Fútbol 7 Astrabudua
          </h1>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
          <div className="bg-red-600 px-5 py-2.5 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-white">
              Próximos partidos
            </p>
          </div>

          {partido ? (
            <div className="p-4">
              <div className="rounded-3xl bg-slate-50 p-3 shadow-inner">
                <div className="mb-3 rounded-2xl bg-slate-950 px-4 py-2 text-center text-white shadow">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-300">
                    {partido.tipo === "grupo"
                      ? "Fase de grupos"
                      : "Eliminatorias"}
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {nombreFaseBonito(partido)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={anteriorPartido}
                    disabled={partidos.length <= 1}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-2xl font-black text-white shadow disabled:bg-slate-300 disabled:text-white"
                  >
                    ‹
                  </button>

                  <div className="min-w-0 flex-1 text-center">
                    <p className="truncate text-lg font-black leading-tight text-slate-950">
                      {partido.home_team?.name ?? "Local"}
                    </p>

                    <p className="my-1.5 text-xs font-black uppercase tracking-widest text-red-600">
                      vs
                    </p>

                    <p className="truncate text-lg font-black leading-tight text-slate-950">
                      {partido.away_team?.name ?? "Visitante"}
                    </p>
                  </div>

                  <button
                    onClick={siguientePartido}
                    disabled={partidos.length <= 1}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-2xl font-black text-white shadow disabled:bg-slate-300 disabled:text-white"
                  >
                    ›
                  </button>
                </div>

                <div className="mx-auto mt-4 max-w-[200px] rounded-2xl bg-slate-950 px-4 py-2.5 text-center text-white shadow-lg">
                  <p className="text-[11px] font-black uppercase text-slate-300">
                    {partido.match_date
                      ? formatearFecha(partido.match_date)
                      : "Fecha pendiente"}
                  </p>
                  <p className="text-3xl font-black leading-none">
                    {partido.match_time ?? "--:--"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-300">
                    {partido.field ?? "Campo pendiente"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="p-5 text-center text-sm font-bold text-slate-500">
              No hay partidos próximos
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href="/equipos"
            className="flex min-h-[52px] items-center justify-center rounded-2xl bg-white/95 px-4 py-2.5 text-center text-base font-black leading-tight shadow"
          >
            Equipos
          </a>

          <a
            href="/favoritos"
            className="flex min-h-[52px] items-center justify-center rounded-2xl bg-white/95 px-4 py-2.5 text-center text-base font-black leading-tight shadow"
          >
            Favoritos
          </a>

          <a
            href="/mvp"
            className="flex min-h-[52px] items-center justify-center rounded-2xl bg-white/95 px-4 py-2.5 text-center text-base font-black leading-tight shadow"
          >
            MVP
          </a>

          <a
            href="/normativa"
            className="flex min-h-[52px] items-center justify-center rounded-2xl bg-white/95 px-4 py-2.5 text-center text-base font-black leading-tight shadow"
          >
            Normativa
          </a>

          <a
            href="/bota-oro"
            className="col-span-2 flex min-h-[56px] items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-center text-lg font-black leading-tight text-white shadow"
          >
            Bota de Oro
          </a>
        </div>
      </section>
    </main>
  );
}