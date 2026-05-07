"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type TeamRef = {
  name: string;
};

type RawGroupMatch = {
  id: string;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  mvp_open: boolean | null;
  home_team: TeamRef[] | TeamRef | null;
  away_team: TeamRef[] | TeamRef | null;
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
  home_penalties: number | null;
  away_penalties: number | null;
  status: string | null;
  sort_order: number;
  mvp_open: boolean | null;
};

type HomeMatch = {
  id: string;
  tipo: "clasificacion" | "final";
  phase: string;
  title: string;
  match_date: string;
  match_time: string | null;
  field: string | null;
  home_name: string;
  away_name: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  sort_order: number;
};

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function fechaHoraPartido(match: HomeMatch) {
  const [year, month, day] = match.match_date.split("-").map(Number);
  const [hour, minute] = (match.match_time ?? "23:59").split(":").map(Number);

  return new Date(year, month - 1, day, hour || 0, minute || 0);
}

function ordenarPartidos(partidos: HomeMatch[]) {
  return [...partidos].sort((a, b) => {
    const fechaA = a.match_date ?? "9999-12-31";
    const fechaB = b.match_date ?? "9999-12-31";

    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);

    const horaA = a.match_time ?? "99:99";
    const horaB = b.match_time ?? "99:99";

    if (horaA !== horaB) return horaA.localeCompare(horaB);

    return a.sort_order - b.sort_order;
  });
}

function tituloPartido(match: HomeMatch) {
  if (match.tipo === "clasificacion") return "Clasificación";
  return match.phase || match.title || "Eliminatoria";
}

function subtituloPartido(match: HomeMatch) {
  if (match.tipo === "clasificacion") return "";
  if (!match.title || match.title === match.phase) return "";
  return match.title;
}

export default function InicioPage() {
  const [partidos, setPartidos] = useState<HomeMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarProximosPartidos();
  }, []);

  async function cargarProximosPartidos() {
    setLoading(true);
    setMensaje("");

    const { data: groupData, error: groupError } = await supabase
      .from("matches")
      .select(
        `
        id,
        group_name,
        match_date,
        match_time,
        field,
        home_score,
        away_score,
        status,
        mvp_open,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `
      )
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (groupError) {
      console.error("Error cargando próximos partidos:", groupError);
      setMensaje("No se han podido cargar los próximos partidos.");
      setLoading(false);
      return;
    }

    const { data: finalData, error: finalError } = await supabase
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
        sort_order,
        mvp_open
      `
      )
      .order("sort_order", { ascending: true });

    if (finalError) {
      console.error("Error cargando eliminatorias:", finalError);
      setMensaje("No se han podido cargar las eliminatorias.");
      setLoading(false);
      return;
    }

    const partidosClasificacion: HomeMatch[] = (
      ((groupData as unknown as RawGroupMatch[]) ?? []) as RawGroupMatch[]
    )
      .filter((match) => Boolean(match.match_date))
      .map((match, index) => {
        const local = normalizarEquipo(match.home_team);
        const visitante = normalizarEquipo(match.away_team);

        return {
          id: match.id,
          tipo: "clasificacion",
          phase: "Clasificación",
          title: "Clasificación",
          match_date: match.match_date as string,
          match_time: match.match_time,
          field: match.field,
          home_name: local?.name ?? "Local",
          away_name: visitante?.name ?? "Visitante",
          home_score: match.home_score,
          away_score: match.away_score,
          status: match.status,
          sort_order: index + 1,
        };
      });

    const partidosFinales: HomeMatch[] = ((finalData ?? []) as FinalMatch[])
      .filter((match) => Boolean(match.match_date))
      .map((match) => ({
        id: match.id,
        tipo: "final",
        phase: match.phase,
        title: match.title,
        match_date: match.match_date as string,
        match_time: match.match_time,
        field: match.field,
        home_name: match.home_ref || "Local",
        away_name: match.away_ref || "Visitante",
        home_score: match.home_score,
        away_score: match.away_score,
        status: match.status,
        sort_order: match.sort_order,
      }));

    const ahora = new Date();

    const proximos = ordenarPartidos([
      ...partidosClasificacion,
      ...partidosFinales,
    ]).filter((match) => {
      if (match.home_score !== null && match.away_score !== null) return false;
      return fechaHoraPartido(match) >= ahora;
    });

    setPartidos(proximos);
    setCurrentIndex(0);
    setLoading(false);
  }

  const partido = partidos[currentIndex] ?? null;

  const puedeRetroceder = currentIndex > 0;
  const puedeAvanzar = currentIndex < partidos.length - 1;

  const fechaPartido = useMemo(() => {
    if (!partido) return "";
    return formatearFecha(partido.match_date);
  }, [partido]);

  function anteriorPartido() {
    if (!puedeRetroceder) return;
    setCurrentIndex((prev) => prev - 1);
  }

  function siguientePartido() {
    if (!puedeAvanzar) return;
    setCurrentIndex((prev) => prev + 1);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <h1 className="whitespace-nowrap text-center text-lg font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </h1>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
          <div className="bg-red-600 px-5 py-4 text-center text-white">
            <p className="text-lg font-black uppercase tracking-widest">
              Próximos partidos
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-center font-bold text-slate-500">
              Cargando próximos partidos...
            </div>
          ) : mensaje ? (
            <div className="p-6 text-center font-bold text-red-600">
              {mensaje}
            </div>
          ) : !partido ? (
            <div className="p-6 text-center font-bold text-slate-500">
              No hay partidos próximos.
            </div>
          ) : (
            <div className="p-5">
              <div className="rounded-3xl bg-slate-50 p-4 shadow-inner">
                <div className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-white shadow">
                  <p className="text-sm font-black uppercase tracking-widest text-red-200">
                    {tituloPartido(partido)}
                  </p>

                  {subtituloPartido(partido) && (
                    <p className="mt-1 text-base font-black text-white">
                      {subtituloPartido(partido)}
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-[42px_1fr_42px] items-center gap-2">
                  <button
                    onClick={anteriorPartido}
                    disabled={!puedeRetroceder}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-3xl font-black text-white shadow disabled:opacity-25"
                  >
                    ‹
                  </button>

                  <div className="min-w-0 text-center">
                    <p className="break-words text-2xl font-black leading-tight text-slate-950">
                      {partido.home_name}
                    </p>

                    <p className="my-1 text-sm font-black uppercase text-red-600">
                      vs
                    </p>

                    <p className="break-words text-2xl font-black leading-tight text-slate-950">
                      {partido.away_name}
                    </p>
                  </div>

                  <button
                    onClick={siguientePartido}
                    disabled={!puedeAvanzar}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-3xl font-black text-white shadow disabled:opacity-25"
                  >
                    ›
                  </button>
                </div>

                <div className="mx-auto mt-5 max-w-[250px] rounded-2xl bg-slate-950 px-5 py-4 text-center text-white shadow">
                  <p className="text-sm font-black text-slate-300">
                    {fechaPartido}
                  </p>

                  <p className="text-4xl font-black leading-tight">
                    {partido.match_time ?? "--:--"}
                  </p>

                  <p className="text-sm font-bold text-slate-300">
                    {partido.field ?? "Campo pendiente"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/calendario"
          className="mt-5 block rounded-2xl bg-red-600 px-5 py-5 text-center text-2xl font-black text-white shadow-2xl"
        >
          Calendario
        </Link>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href="/equipos"
            className="rounded-2xl bg-white/95 p-4 text-center text-lg font-black text-slate-900 shadow"
          >
            Equipos
          </Link>

          <Link
            href="/favoritos"
            className="rounded-2xl bg-white/95 p-4 text-center text-lg font-black text-slate-900 shadow"
          >
            Favoritos
          </Link>

          <Link
            href="/mvp"
            className="rounded-2xl bg-white/95 p-4 text-center text-lg font-black text-slate-900 shadow"
          >
            MVP
          </Link>

          <Link
            href="/normativa"
            className="rounded-2xl bg-white/95 p-4 text-center text-lg font-black text-slate-900 shadow"
          >
            Normativa
          </Link>

          <Link
            href="/bota-oro"
            className="rounded-2xl bg-white/95 p-4 text-center text-lg font-black text-slate-900 shadow"
          >
            Bota de oro
          </Link>

          <Link
            href="/sancionados"
            className="rounded-2xl bg-white/95 p-4 text-center text-lg font-black text-slate-900 shadow"
          >
            Sancionados
          </Link>
        </div>

        <Link
          href="/admin"
          className="mt-3 block rounded-2xl bg-slate-950 px-5 py-4 text-center text-lg font-black text-white shadow-2xl"
        >
          Panel admin
        </Link>
      </section>
    </main>
  );
}