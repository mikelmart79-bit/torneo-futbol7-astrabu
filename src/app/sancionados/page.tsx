"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

type Suspension = {
  id: string;
  player_id: string;
  team_id: string;
  match_id: string | null;
  final_match_id: string | null;
  reason: string;
  games: number;
  served: number;
  status: string;
  created_at: string | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
};

type Team = {
  id: string;
  name: string;
};

type Match = {
  id: string;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
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
};

type SuspensionRow = {
  id: string;
  playerName: string;
  playerNumber: number | null;
  teamName: string;
  reason: string;
  games: number;
  served: number;
  status: string;
  origin: string;
};

function normalizarEquipo(equipo: RawMatch["home_team"]): { name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function estadoPendiente(status: string) {
  return status !== "Cumplida";
}

export default function SancionadosPage() {
  const [rows, setRows] = useState<SuspensionRow[]>([]);
  const [filtro, setFiltro] = useState<"pendientes" | "todas">("pendientes");
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarSancionados();
  }, []);

  async function cargarSancionados() {
    setLoading(true);
    setMensaje("");

    const { data: suspensionsData, error: suspensionsError } = await supabase
      .from("suspensions")
      .select(
        "id, player_id, team_id, match_id, final_match_id, reason, games, served, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (suspensionsError) {
      console.error("Error cargando sanciones:", suspensionsError);
      setMensaje("No se han podido cargar los sancionados.");
      setLoading(false);
      return;
    }

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, team_id, name, number");

    if (playersError) {
      console.error("Error cargando jugadores:", playersError);
      setMensaje("No se han podido cargar los jugadores.");
      setLoading(false);
      return;
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name");

    if (teamsError) {
      console.error("Error cargando equipos:", teamsError);
      setMensaje("No se han podido cargar los equipos.");
      setLoading(false);
      return;
    }

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select(
        `
        id,
        match_date,
        match_time,
        field,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `
      );

    if (matchesError) {
      console.error("Error cargando partidos:", matchesError);
    }

    const { data: finalMatchesData, error: finalMatchesError } = await supabase
      .from("final_matches")
      .select(
        "id, phase, title, home_ref, away_ref, match_date, match_time, field"
      );

    if (finalMatchesError) {
      console.error("Error cargando eliminatorias:", finalMatchesError);
    }

    const suspensions = (suspensionsData ?? []) as Suspension[];
    const players = (playersData ?? []) as Player[];
    const teams = (teamsData ?? []) as Team[];

    const matches: Match[] = ((matchesData as unknown as RawMatch[]) || []).map(
      (match) => ({
        ...match,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      })
    );

    const finalMatches = (finalMatchesData ?? []) as FinalMatch[];

    const rowsFinales: SuspensionRow[] = suspensions.map((suspension) => {
      const player = players.find((item) => item.id === suspension.player_id);
      const team = teams.find((item) => item.id === suspension.team_id);

      let origin = "Partido no identificado";

      if (suspension.match_id) {
        const match = matches.find((item) => item.id === suspension.match_id);

        if (match) {
          const fecha = match.match_date
            ? formatearFecha(match.match_date)
            : "Fecha pendiente";

          origin = `${match.home_team?.name ?? "Local"} vs ${
            match.away_team?.name ?? "Visitante"
          } · ${fecha}`;
        }
      }

      if (suspension.final_match_id) {
        const finalMatch = finalMatches.find(
          (item) => item.id === suspension.final_match_id
        );

        if (finalMatch) {
          const fecha = finalMatch.match_date
            ? formatearFecha(finalMatch.match_date)
            : "Fecha pendiente";

          origin = `${finalMatch.phase} · ${finalMatch.title} · ${
            finalMatch.home_ref
          } vs ${finalMatch.away_ref} · ${fecha}`;
        }
      }

      return {
        id: suspension.id,
        playerName: player?.name ?? "Jugador",
        playerNumber: player?.number ?? null,
        teamName: team?.name ?? "Equipo",
        reason: suspension.reason,
        games: suspension.games,
        served: suspension.served,
        status: suspension.status,
        origin,
      };
    });

    rowsFinales.sort((a, b) => {
      const aPendiente = estadoPendiente(a.status);
      const bPendiente = estadoPendiente(b.status);

      if (aPendiente !== bPendiente) return aPendiente ? -1 : 1;

      if (a.teamName !== b.teamName) return a.teamName.localeCompare(b.teamName);

      return a.playerName.localeCompare(b.playerName);
    });

    setRows(rowsFinales);
    setLoading(false);
  }

  const pendientes = rows.filter((row) => estadoPendiente(row.status));
  const rowsMostrar = filtro === "pendientes" ? pendientes : rows;

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
            Sancionados
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Jugadores con sanción pendiente o cumplida
          </p>
        </div>

        <Link
          href="/inicio"
          className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
        >
          Volver al inicio
        </Link>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setFiltro("pendientes")}
            className={`rounded-2xl px-4 py-3 text-sm font-black shadow ${
              filtro === "pendientes"
                ? "bg-red-600 text-white"
                : "bg-white/95 text-slate-900"
            }`}
          >
            Pendientes
          </button>

          <button
            onClick={() => setFiltro("todas")}
            className={`rounded-2xl px-4 py-3 text-sm font-black shadow ${
              filtro === "todas"
                ? "bg-red-600 text-white"
                : "bg-white/95 text-slate-900"
            }`}
          >
            Todas
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
            Cargando sancionados...
          </div>
        ) : mensaje ? (
          <div className="mt-6 rounded-3xl bg-red-100 p-5 text-sm font-bold text-red-700 shadow-2xl">
            {mensaje}
          </div>
        ) : rowsMostrar.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl">
            <p className="text-sm font-bold text-slate-500">
              {filtro === "pendientes"
                ? "No hay jugadores sancionados pendientes."
                : "Todavía no hay sanciones registradas."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {rowsMostrar.map((row) => {
              const pendiente = estadoPendiente(row.status);
              const restantes = Math.max(row.games - row.served, 0);

              return (
                <div
                  key={row.id}
                  className={`rounded-3xl p-5 shadow-2xl ${
                    pendiente
                      ? "bg-white/95 text-slate-900"
                      : "bg-slate-200/95 text-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-black leading-tight">
                        {row.playerNumber !== null
                          ? `${row.playerNumber} · ${row.playerName}`
                          : row.playerName}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {row.teamName}
                      </p>
                    </div>

                    <div
                      className={`rounded-2xl px-3 py-2 text-center text-xs font-black uppercase ${
                        pendiente
                          ? "bg-red-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {row.status}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm font-black text-slate-900">
                      {row.reason}
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-600">
                      Sanción: {row.games} partido(s)
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-600">
                      Cumplidos: {row.served} · Restan: {restantes}
                    </p>
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-500">
                    Origen: {row.origin}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}