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
  status: string | null;
  sort_order?: number | null;
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
  status: string | null;
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
  status: string | null;
  sort_order: number;
};

function normalizarEquipo(
  equipo: RawMatch["home_team"],
): { name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
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

function horaCorta(hora: string | null) {
  if (!hora) return null;
  return hora.slice(0, 5);
}

function esPartidoProximo(partido: Match) {
  if (!partido.match_date) return false;

  const estado = normalizarTexto(partido.status);

  if (estado === "finalizado" || estado === "cerrado") {
    return false;
  }

  const hoy = fechaLocalHoy();
  const horaActual = horaLocalActual();
  const horaPartido = horaCorta(partido.match_time);

  if (partido.match_date > hoy) return true;
  if (partido.match_date < hoy) return false;

  if (!horaPartido) return true;

  return horaPartido >= horaActual;
}

function ordenarPartidos(partidos: Match[]) {
  return [...partidos].sort((a, b) => {
    const fechaA = a.match_date ?? "9999-12-31";
    const fechaB = b.match_date ?? "9999-12-31";

    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);

    const horaA = horaCorta(a.match_time) ?? "99:99";
    const horaB = horaCorta(b.match_time) ?? "99:99";

    if (horaA !== horaB) return horaA.localeCompare(horaB);

    return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
  });
}

function nombreFaseBonito(partido: Match) {
  if (partido.tipo === "grupo") return "Clasificación";

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
  const [loading, setLoading] = useState(true);

  const partido = partidos[indicePartido] ?? null;

  useEffect(() => {
    async function cargarProximos() {
      setLoading(true);

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
          status,
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
          status,
          sort_order
        `)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true })
        .order("sort_order", { ascending: true });

      if (matchesError) {
        console.error("Error cargando próximos partidos:", matchesError);
      }

      if (finalError) {
        console.error("Error cargando próximas eliminatorias:", finalError);
      }

      const partidosGrupo: Match[] = matchesError
        ? []
        : (((matchesData as unknown as RawMatch[]) || []).map(
            (match, index) => ({
              id: match.id,
              tipo: "grupo" as const,
              group_name: match.group_name,
              match_date: match.match_date,
              match_time: match.match_time,
              field: match.field,
              home_score: match.home_score,
              away_score: match.away_score,
              status: match.status,
              sort_order: index + 1,
              home_team: normalizarEquipo(match.home_team),
              away_team: normalizarEquipo(match.away_team),
            }),
          ));

      const partidosFinales: Match[] = finalError
        ? []
        : (((finalData ?? []) as FinalMatch[]).map((match) => ({
            id: match.id,
            tipo: "final" as const,
            phase: match.phase,
            title: match.title,
            group_name: null,
            match_date: match.match_date,
            match_time: match.match_time,
            field: match.field,
            home_score: match.home_score,
            away_score: match.away_score,
            status: match.status,
            sort_order: match.sort_order,
            home_team: match.home_ref
              ? { name: match.home_ref }
              : { name: "Local" },
            away_team: match.away_ref
              ? { name: match.away_ref }
              : { name: "Visitante" },
          })));

      const proximos = ordenarPartidos([
        ...partidosGrupo,
        ...partidosFinales,
      ]).filter(esPartidoProximo);

      setPartidos(proximos.slice(0, 20));
      setIndicePartido(0);
      setLoading(false);
    }

    cargarProximos();
  }, []);

  function accesoAdminOculto() {
    setToquesAdmin((actual) => {
      const nuevo = actual + 1;

      if (nuevo >= 5) {
        sessionStorage.setItem("zonaPeligrosaAdmin", "true");
        router.push("/admin?danger=1");
        return 0;
      }

      return nuevo;
    });
  }

  function anteriorPartido() {
    if (partidos.length <= 1) return;

    setIndicePartido((actual) =>
      actual === 0 ? partidos.length - 1 : actual - 1,
    );
  }

  function siguientePartido() {
    if (partidos.length <= 1) return;

    setIndicePartido((actual) =>
      actual === partidos.length - 1 ? 0 : actual + 1,
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-4 py-3 pb-8">
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

          {loading ? (
            <p className="p-5 text-center text-sm font-bold text-slate-500">
              Cargando próximos partidos...
            </p>
          ) : partido ? (
            <div className="p-4">
              <div className="rounded-3xl bg-slate-50 p-3 shadow-inner">
                <div className="mb-3 rounded-2xl bg-slate-950 px-4 py-2.5 text-center text-white shadow">
                  <p className="text-sm font-black text-white">
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
                    {horaCorta(partido.match_time) ?? "--:--"}
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
            href="/calendario"
            className="col-span-2 flex min-h-[58px] items-center justify-center gap-3 rounded-2xl bg-red-600 px-4 py-3 text-center text-lg font-black leading-tight text-white shadow"
          >
            <span className="text-2xl">📅</span>
            <span>Calendario</span>
          </a>

          <a
            href="/equipos"
            className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-white/95 px-4 py-3 text-center text-lg font-black leading-tight text-slate-900 shadow"
          >
            <span className="text-2xl">🛡️</span>
            <span>Equipos</span>
          </a>

          <a
            href="/mvp"
            className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-white/95 px-4 py-3 text-center text-lg font-black leading-tight text-slate-900 shadow"
          >
            <span className="text-2xl">⭐</span>
            <span>MVP</span>
          </a>

          <a
            href="/bota-oro"
            className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-white/95 px-4 py-3 text-center text-lg font-black leading-tight text-slate-900 shadow"
          >
            <span className="text-2xl">⚽</span>
            <span>Bota de Oro</span>
          </a>

          <a
            href="/sancionados"
            className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-white/95 px-4 py-3 text-center text-lg font-black leading-tight text-slate-900 shadow"
          >
            <span className="text-2xl">🟥</span>
            <span>Sancionados</span>
          </a>
        </div>
      </section>
    </main>
  );
}