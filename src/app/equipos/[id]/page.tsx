"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
  home_color: string | null;
  away_color: string | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
};

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
  mvp_open: boolean | null;
  sort_order: number;
};

type MatchCard = {
  id: string;
  tipo: "grupo" | "final";
  etiqueta: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_name: string;
  away_name: string;
  home_score: number | null;
  away_score: number | null;
  home_penalties?: number | null;
  away_penalties?: number | null;
  status: string | null;
  mvp_open: boolean | null;
};

function normalizarEquipo(equipo: RawGroupMatch["home_team"]): TeamRef | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function normalizarTexto(texto: string) {
  return texto.trim().toLowerCase();
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

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

function partidoEsFuturo(match: MatchCard) {
  if (!match.match_date || !match.match_time) return true;

  const hoy = fechaLocalHoy();
  const horaActual = horaLocalActual();

  if (match.match_date > hoy) return true;
  if (match.match_date === hoy && match.match_time >= horaActual) return true;

  return false;
}

function partidoConResultado(match: MatchCard) {
  return match.home_score !== null && match.away_score !== null;
}

function ShirtIcon({ color }: { color: string }) {
  return (
    <div className="relative h-10 w-11">
      <div
        className="absolute left-2 top-1 h-9 w-7 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute left-0 top-2 h-4 w-4 -rotate-12 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute right-0 top-2 h-4 w-4 rotate-12 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

export default function EquipoDetalle() {
  const params = useParams();
  const idParam = params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [equipo, setEquipo] = useState<Team | null>(null);
  const [jugadores, setJugadores] = useState<Player[]>([]);
  const [partidos, setPartidos] = useState<MatchCard[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    const guardados = localStorage.getItem("equiposFavoritos");

    if (guardados) {
      try {
        setFavoritos(JSON.parse(guardados));
      } catch {
        localStorage.removeItem("equiposFavoritos");
        setFavoritos([]);
      }
    }

    async function cargarEquipo() {
      setLoading(true);
      setErrorCarga("");

      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id, name, group_name, home_color, away_color")
        .eq("id", id)
        .single();

      if (teamError || !teamData) {
        setEquipo(null);
        setErrorCarga("No se ha podido cargar el equipo.");
        setLoading(false);
        return;
      }

      const equipoActual = teamData as Team;
      setEquipo(equipoActual);

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, team_id, name, number")
        .eq("team_id", id)
        .order("number", { ascending: true })
        .order("name", { ascending: true });

      if (playersError) {
        setErrorCarga("No se ha podido cargar la plantilla.");
        setLoading(false);
        return;
      }

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
          mvp_open,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `)
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true });

      if (matchesError) {
        setErrorCarga("No se han podido cargar los partidos del equipo.");
        setLoading(false);
        return;
      }

      const partidosGrupo: MatchCard[] = (
        (matchesData as unknown as RawGroupMatch[]) || []
      ).map((match) => {
        const local = normalizarEquipo(match.home_team);
        const visitante = normalizarEquipo(match.away_team);

        return {
          id: match.id,
          tipo: "grupo" as const,
          etiqueta: match.group_name ?? "Fase de grupos",
          match_date: match.match_date,
          match_time: match.match_time,
          field: match.field,
          home_name: local?.name ?? "Local",
          away_name: visitante?.name ?? "Visitante",
          home_score: match.home_score,
          away_score: match.away_score,
          status: match.status,
          mvp_open: match.mvp_open,
        };
      });

      const { data: finalData } = await supabase
        .from("final_matches")
        .select(
          "id, phase, title, home_ref, away_ref, match_date, match_time, field, home_score, away_score, home_penalties, away_penalties, status, mvp_open, sort_order"
        )
        .order("sort_order", { ascending: true });

      const nombreEquipo = normalizarTexto(equipoActual.name);

      const eliminatorias: MatchCard[] = ((finalData ?? []) as FinalMatch[])
        .filter(
          (match) =>
            normalizarTexto(match.home_ref) === nombreEquipo ||
            normalizarTexto(match.away_ref) === nombreEquipo
        )
        .map((match) => ({
          id: match.id,
          tipo: "final" as const,
          etiqueta: `${match.phase} · ${match.title}`,
          match_date: match.match_date,
          match_time: match.match_time,
          field: match.field,
          home_name: match.home_ref,
          away_name: match.away_ref,
          home_score: match.home_score,
          away_score: match.away_score,
          home_penalties: match.home_penalties,
          away_penalties: match.away_penalties,
          status: match.status,
          mvp_open: match.mvp_open,
        }));

      const todosPartidos = [...partidosGrupo, ...eliminatorias].sort((a, b) => {
        const fechaA = a.match_date ?? "9999-12-31";
        const fechaB = b.match_date ?? "9999-12-31";

        if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);

        const horaA = a.match_time ?? "99:99";
        const horaB = b.match_time ?? "99:99";

        return horaA.localeCompare(horaB);
      });

      setJugadores((playersData ?? []) as Player[]);
      setPartidos(todosPartidos);
      setLoading(false);
    }

    cargarEquipo();
  }, [id]);

  function toggleFavorito() {
    if (!equipo) return;

    const nuevosFavoritos = favoritos.includes(equipo.id)
      ? favoritos.filter((item) => item !== equipo.id)
      : [...favoritos, equipo.id];

    setFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));
  }

  function renderPartido(match: MatchCard) {
    const hayPenaltis =
      match.home_penalties !== null &&
      match.home_penalties !== undefined &&
      match.away_penalties !== null &&
      match.away_penalties !== undefined;

    return (
      <div key={match.id} className="rounded-2xl bg-slate-50 p-4 shadow-sm">
        <p className="text-xs font-black uppercase text-red-600">
          {match.etiqueta}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="break-words text-base font-black leading-tight">
              {match.home_name}
            </p>
            <p className="text-xs font-black uppercase text-slate-400">vs</p>
            <p className="break-words text-base font-black leading-tight">
              {match.away_name}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-slate-950 px-3 py-2 text-center text-white shadow">
            {partidoConResultado(match) ? (
              <p className="text-2xl font-black">
                {match.home_score} - {match.away_score}
              </p>
            ) : (
              <p className="text-lg font-black text-red-400">
                {match.match_time ?? "--:--"}
              </p>
            )}

            <p className="text-xs font-bold text-slate-300">
              {match.field ?? "Campo pendiente"}
            </p>
          </div>
        </div>

        {hayPenaltis && (
          <div className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-center text-sm font-black text-amber-800">
            Penaltis: {match.home_penalties} - {match.away_penalties}
          </div>
        )}

        <p className="mt-3 text-sm font-bold text-slate-500">
          {formatearFechaSegura(match.match_date)} ·{" "}
          {match.match_time ?? "Hora pendiente"}
        </p>

        {match.mvp_open && (
          <Link
            href={`/votar-mvp?match=${match.id}`}
            className="mt-3 block rounded-xl bg-red-600 px-3 py-2 text-center text-sm font-black text-white shadow"
          >
            Votar MVP
          </Link>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />
        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-white/95 p-5 font-bold shadow">
            Cargando equipo...
          </div>
        </section>
      </main>
    );
  }

  if (!equipo) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />
        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-white/95 p-5 shadow">
            <p className="font-bold">
              {errorCarga || "Equipo no encontrado."}
            </p>
            <Link
              href="/equipos"
              className="mt-4 inline-block font-black text-red-600"
            >
              ← Volver a equipos
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const colorLocal = equipo.home_color || "#047857";
  const colorVisitante = equipo.away_color || "#dc2626";
  const esFavorito = favoritos.includes(equipo.id);

  const proximos = partidos.filter(
    (match) => !partidoConResultado(match) && partidoEsFuturo(match)
  );

  const resultados = partidos.filter((match) => partidoConResultado(match));

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
        <Link
          href="/equipos"
          className="mb-4 block rounded-2xl bg-white/95 px-4 py-3 text-center text-sm font-black text-slate-900 shadow"
        >
          ← Volver a equipos
        </Link>

        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>

          <h1 className="mt-2 break-words text-center text-3xl font-black leading-tight">
            {equipo.name}
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            {equipo.group_name ?? "Sin grupo"}
          </p>
        </div>

        <button
          onClick={toggleFavorito}
          className={`mt-5 w-full rounded-2xl py-4 text-center text-base font-black shadow-2xl ${
            esFavorito
              ? "bg-red-600 text-white"
              : "bg-white/95 text-slate-900"
          }`}
        >
          {esFavorito ? "★ Equipo favorito" : "☆ Añadir a favoritos"}
        </button>

        <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <h2 className="text-xl font-black">Equipaciones</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <div className="flex justify-center">
                <ShirtIcon color={colorLocal} />
              </div>
              <p className="mt-2 text-sm font-black text-slate-700">Local</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <div className="flex justify-center">
                <ShirtIcon color={colorVisitante} />
              </div>
              <p className="mt-2 text-sm font-black text-slate-700">
                Visitante
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Plantilla</h2>
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
              {jugadores.length} jugadores
            </span>
          </div>

          {jugadores.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
              Este equipo todavía no tiene jugadores añadidos.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {jugadores.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white">
                    {player.number ?? "-"}
                  </div>

                  <p className="break-words text-lg font-black leading-tight">
                    {player.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <div className="mb-3 rounded-xl bg-slate-950 px-4 py-3 text-white">
            <p className="text-sm font-black uppercase tracking-widest">
              Próximos partidos
            </p>
          </div>

          {proximos.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
              No hay próximos partidos de este equipo.
            </p>
          ) : (
            <div className="space-y-3">
              {proximos.map((match) => renderPartido(match))}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <div className="mb-3 rounded-xl bg-red-600 px-4 py-3 text-white">
            <p className="text-sm font-black uppercase tracking-widest">
              Resultados
            </p>
          </div>

          {resultados.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
              Todavía no hay resultados de este equipo.
            </p>
          ) : (
            <div className="space-y-3">
              {resultados.map((match) => renderPartido(match))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}