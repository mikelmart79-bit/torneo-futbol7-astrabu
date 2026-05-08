"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type CalendarMatch = {
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
  home_penalties: number | null;
  away_penalties: number | null;
  status: string | null;
  mvp_open: boolean | null;
  sort_order: number;
};

type CalendarMonth = {
  year: number;
  monthIndex: number;
};

const DEFAULT_MONTHS: CalendarMonth[] = [
  { year: 2026, monthIndex: 6 }, // julio
  { year: 2026, monthIndex: 7 }, // agosto
];

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function fechaToParts(fecha: string) {
  const [year, month, day] = fecha.split("-").map(Number);

  return {
    year,
    monthIndex: month - 1,
    day,
  };
}

function fechaDesdeParts(year: number, monthIndex: number, day: number) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");

  return `${year}-${month}-${dayText}`;
}

function nombreMesCorto(year: number, monthIndex: number) {
  const mes = new Intl.DateTimeFormat("es-ES", {
    month: "long",
  }).format(new Date(year, monthIndex, 1));

  return `${mes} ${String(year).slice(2)}`;
}

function labelFase(partidos: CalendarMatch[]) {
  const fases = Array.from(
    new Set(
      partidos.map((partido) =>
        partido.tipo === "clasificacion" ? "Clasificación" : partido.phase
      )
    )
  );

  if (fases.length === 0) return "";

  if (fases.length === 1) return fases[0];

  return fases.slice(0, 2).join(" + ");
}

function ordenarPartidos(partidos: CalendarMatch[]) {
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

function marcadorTexto(partido: CalendarMatch) {
  if (partido.home_score === null || partido.away_score === null) {
    return "vs";
  }

  const marcador = `${partido.home_score} - ${partido.away_score}`;

  if (
    partido.tipo === "final" &&
    partido.home_penalties !== null &&
    partido.away_penalties !== null
  ) {
    return `${marcador} · Pen. ${partido.home_penalties}-${partido.away_penalties}`;
  }

  return marcador;
}

function mismoMes(fecha: string, month: CalendarMonth) {
  const parts = fechaToParts(fecha);

  return parts.year === month.year && parts.monthIndex === month.monthIndex;
}

function tituloPartido(match: CalendarMatch) {
  if (match.tipo === "clasificacion") return "Clasificación";
  return match.title || match.phase || "Eliminatoria";
}

function estadoPermiteVerActa(status: string | null | undefined) {
  const limpio = (status ?? "").trim().toLowerCase();

  return limpio === "finalizado" || limpio === "cerrado";
}

function tipoActa(match: CalendarMatch) {
  return match.tipo === "final" ? "final" : "grupo";
}

export default function CalendarioPage() {
  const [matches, setMatches] = useState<CalendarMatch[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [activeMonthPosition, setActiveMonthPosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const detalleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cargarPartidos();
  }, []);

  async function cargarPartidos() {
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
      console.error("Error cargando partidos:", groupError);
      setMensaje("No se han podido cargar los partidos de clasificación.");
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

    const partidosGrupo: CalendarMatch[] = (
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
          title: match.group_name ?? "Clasificación",
          match_date: match.match_date as string,
          match_time: match.match_time,
          field: match.field,
          home_name: local?.name ?? "Local",
          away_name: visitante?.name ?? "Visitante",
          home_score: match.home_score,
          away_score: match.away_score,
          home_penalties: null,
          away_penalties: null,
          status: match.status,
          mvp_open: match.mvp_open,
          sort_order: index + 1,
        };
      });

    const partidosFinales: CalendarMatch[] = ((finalData ?? []) as FinalMatch[])
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
        home_penalties: match.home_penalties,
        away_penalties: match.away_penalties,
        status: match.status,
        mvp_open: match.mvp_open,
        sort_order: match.sort_order,
      }));

    const todos = ordenarPartidos([...partidosGrupo, ...partidosFinales]);

    setMatches(todos);

    if (todos.length > 0) {
      setSelectedDate(todos[0].match_date);
    } else {
      setSelectedDate("");
    }

    setActiveMonthPosition(0);
    setLoading(false);
  }

  const matchesByDate = useMemo(() => {
    const grouped: Record<string, CalendarMatch[]> = {};

    matches.forEach((match) => {
      if (!grouped[match.match_date]) grouped[match.match_date] = [];
      grouped[match.match_date].push(match);
    });

    Object.keys(grouped).forEach((date) => {
      grouped[date] = ordenarPartidos(grouped[date]);
    });

    return grouped;
  }, [matches]);

  const months = useMemo(() => {
    const uniqueMonths = new Map<string, CalendarMonth>();

    DEFAULT_MONTHS.forEach((month) => {
      uniqueMonths.set(`${month.year}-${month.monthIndex}`, month);
    });

    matches.forEach((match) => {
      const { year, monthIndex } = fechaToParts(match.match_date);
      const key = `${year}-${monthIndex}`;

      uniqueMonths.set(key, { year, monthIndex });
    });

    return Array.from(uniqueMonths.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });
  }, [matches]);

  const activeMonth = months[activeMonthPosition] ?? months[0];

  const selectedMatches = selectedDate ? matchesByDate[selectedDate] ?? [] : [];

  function seleccionarDia(date: string) {
    setSelectedDate(date);

    setTimeout(() => {
      detalleRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }

  function cambiarMes(newPosition: number) {
    const nuevaPosicion = Math.max(0, Math.min(newPosition, months.length - 1));
    const nuevoMes = months[nuevaPosicion];

    setActiveMonthPosition(nuevaPosicion);

    const primerPartidoMes = matches.find((match) =>
      mismoMes(match.match_date, nuevoMes)
    );

    setSelectedDate(primerPartidoMes?.match_date ?? "");
  }

  function renderMonth(month: CalendarMonth) {
    const firstDay = new Date(month.year, month.monthIndex, 1);
    const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: Array<number | null> = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return (
      <div className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
        <div className="bg-red-600 px-4 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => cambiarMes(activeMonthPosition - 1)}
              disabled={activeMonthPosition === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl font-black disabled:opacity-30"
            >
              ‹
            </button>

            <p className="text-center text-xl font-black capitalize">
              {nombreMesCorto(month.year, month.monthIndex)}
            </p>

            <button
              onClick={() => cambiarMes(activeMonthPosition + 1)}
              disabled={activeMonthPosition === months.length - 1}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl font-black disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-7 gap-1 px-1 pb-2 text-center text-xs font-black uppercase text-slate-400">
            {WEEK_DAYS.map((day) => (
              <p key={day}>{day}</p>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-[62px]" />;
              }

              const date = fechaDesdeParts(month.year, month.monthIndex, day);
              const dayMatches = matchesByDate[date] ?? [];
              const hasMatches = dayMatches.length > 0;
              const selected = selectedDate === date;

              return (
                <button
                  key={date}
                  onClick={() => {
                    if (hasMatches) seleccionarDia(date);
                  }}
                  disabled={!hasMatches}
                  className={`min-h-[62px] rounded-2xl p-1 text-left shadow-sm transition ${
                    selected
                      ? "bg-red-600 text-white"
                      : hasMatches
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <p className="text-sm font-black">{day}</p>

                  {hasMatches ? (
                    <div className="mt-1">
                      <p
                        className={`text-[10px] font-black leading-tight ${
                          selected ? "text-red-100" : "text-red-300"
                        }`}
                      >
                        {dayMatches.length} partido
                        {dayMatches.length === 1 ? "" : "s"}
                      </p>

                      <p
                        className={`mt-0.5 line-clamp-2 text-[9px] font-bold leading-tight ${
                          selected ? "text-white" : "text-slate-200"
                        }`}
                      >
                        {labelFase(dayMatches)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[10px] font-bold">—</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
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
            Calendario
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Toca un día para ver sus partidos
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
            Cargando calendario...
          </div>
        ) : mensaje ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 text-sm font-bold text-red-700 shadow-2xl">
            {mensaje}
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {activeMonth && renderMonth(activeMonth)}

            <div
              ref={detalleRef}
              className="scroll-mt-6 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur"
            >
              <div className="bg-slate-950 px-5 py-4 text-center text-white">
                <h2 className="text-2xl font-black">
                  {selectedDate ? formatearFecha(selectedDate) : "Sin fecha"}
                </h2>
              </div>

              <div className="p-4">
                {selectedMatches.length === 0 ? (
                  <p className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-500">
                    Toca un día con partidos para ver el detalle.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-300">
                    {selectedMatches.map((match) => {
                      const hayResultado =
                        match.home_score !== null && match.away_score !== null;

                      return (
                        <div
                          key={`${match.tipo}-${match.id}`}
                          className="py-4 first:pt-0 last:pb-0"
                        >
                          <div className="overflow-hidden rounded-3xl bg-slate-100 shadow-sm">
                            <div
                              className={`px-4 py-3 text-white ${
                                match.tipo === "final"
                                  ? "bg-slate-950"
                                  : "bg-red-600"
                              }`}
                            >
                              <div className="grid grid-cols-[72px_1fr_72px] items-center gap-2">
                                <div />

                                <p className="text-center text-base font-black text-white">
                                  {tituloPartido(match)}
                                </p>

                                <p className="justify-self-end rounded-full bg-white/20 px-3 py-1 text-xs font-black">
                                  {match.status ?? "Pendiente"}
                                </p>
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="grid grid-cols-[minmax(0,1fr)_46px_minmax(0,1fr)] items-center gap-2">
                                <p className="min-w-0 break-words text-center text-sm font-black leading-tight text-slate-950">
                                  {match.home_name}
                                </p>

                                <div className="rounded-xl bg-slate-950 px-1 py-2 text-center text-white shadow">
                                  <p
                                    className={`font-black leading-none ${
                                      hayResultado
                                        ? "text-base"
                                        : "text-sm uppercase"
                                    }`}
                                  >
                                    {marcadorTexto(match)}
                                  </p>
                                </div>

                                <p className="min-w-0 break-words text-center text-sm font-black leading-tight text-slate-950">
                                  {match.away_name}
                                </p>
                              </div>

                              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-white p-3">
                                <div>
                                  <p className="text-xs font-black uppercase text-slate-400">
                                    Hora
                                  </p>

                                  <p className="text-lg font-black text-slate-950">
                                    {match.match_time ?? "--:--"}
                                  </p>
                                </div>

                                {estadoPermiteVerActa(match.status) ? (
                                  <Link
                                    href={`/admin/acta-partido?match=${
                                      match.id
                                    }&type=${tipoActa(match)}`}
                                    className="rounded-xl bg-slate-950 px-4 py-3 text-center text-xs font-black uppercase text-white shadow"
                                  >
                                    Ver acta
                                  </Link>
                                ) : (
                                  <div />
                                )}

                                <div className="text-right">
                                  <p className="text-xs font-black uppercase text-slate-400">
                                    Campo
                                  </p>

                                  <p className="text-sm font-black text-slate-950">
                                    {match.field ?? "Pendiente"}
                                  </p>
                                </div>
                              </div>

                              {match.mvp_open && (
                                <Link
                                  href={`/votar-mvp?match=${
                                    match.id
                                  }&type=${
                                    match.tipo === "final" ? "final" : "grupo"
                                  }`}
                                  className="mt-3 block rounded-xl bg-red-600 py-3 text-center text-sm font-black text-white shadow"
                                >
                                  Votar MVP
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}