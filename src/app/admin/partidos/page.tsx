"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Match = {
  id: string;
  group_name: string;
  match_date: string;
  match_time: string;
  field: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  mvp_open: boolean;
  home_team: { name: string };
  away_team: { name: string };
};

export default function AdminPartidosPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [partidoId, setPartidoId] = useState("");
  const [golesLocal, setGolesLocal] = useState("");
  const [golesVisitante, setGolesVisitante] = useState("");
  const [estado, setEstado] = useState("Pendiente");
  const [mvpOpen, setMvpOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const partido = matches.find((match) => match.id === partidoId);

  useEffect(() => {
    cargarPartidos();
  }, []);

  async function cargarPartidos() {
    const { data, error } = await supabase
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

    if (error) {
      console.error("Error cargando partidos:", error);
      setMensaje("Error cargando partidos.");
      setLoading(false);
      return;
    }

    const partidos = (data ?? []) as unknown as Match[];
    setMatches(partidos);

    if (partidos.length > 0 && !partidoId) {
      seleccionarPartido(partidos[0], partidos);
    }

    setLoading(false);
  }

  function seleccionarPartido(match: Match, lista = matches) {
    setPartidoId(match.id);
    setGolesLocal(match.home_score?.toString() ?? "");
    setGolesVisitante(match.away_score?.toString() ?? "");
    setEstado(match.status ?? "Pendiente");
    setMvpOpen(Boolean(match.mvp_open));
    setMensaje("");
  }

  function cambiarPartido(id: string) {
    const nuevoPartido = matches.find((match) => match.id === id);
    if (!nuevoPartido) return;
    seleccionarPartido(nuevoPartido);
  }

  async function guardarResultado() {
    if (!partido) return;

    const local =
      golesLocal.trim() === "" ? null : Number.parseInt(golesLocal, 10);
    const visitante =
      golesVisitante.trim() === "" ? null : Number.parseInt(golesVisitante, 10);

    const { error } = await supabase
      .from("matches")
      .update({
        home_score: local,
        away_score: visitante,
        status: estado,
        mvp_open: mvpOpen,
      })
      .eq("id", partido.id);

    if (error) {
      console.error("Error guardando resultado:", error);
      setMensaje("No se ha podido guardar el resultado.");
      return;
    }

    setMensaje(
      `Resultado guardado: ${partido.home_team?.name} ${local ?? "-"} - ${
        visitante ?? "-"
      } ${partido.away_team?.name}`
    );

    await cargarPartidos();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-20">
        <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
	<div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
  	  <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
         </p>
         <h1 className="mt-2 text-center text-3xl font-black">
            Meter resultados
        </h1>
      </div>

        <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          {loading ? (
            <p className="font-bold">Cargando partidos...</p>
          ) : (
            <>
              <label className="text-sm font-black uppercase text-slate-500">
                Partido
              </label>

              <select
                value={partidoId}
                onChange={(event) => cambiarPartido(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
              >
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.home_team?.name} vs {match.away_team?.name} ·{" "}
                    {match.match_date} · {match.match_time}
                  </option>
                ))}
              </select>

              {partido && (
                <>
                  <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm font-black text-red-600">
                      {partido.group_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {partido.match_date} · {partido.match_time} ·{" "}
                      {partido.field}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-[1fr_80px] items-center gap-3">
                    <p className="font-black">{partido.home_team?.name}</p>
                    <input
                      type="number"
                      min="0"
                      value={golesLocal}
                      onChange={(event) => setGolesLocal(event.target.value)}
                      className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                    />

                    <p className="font-black">{partido.away_team?.name}</p>
                    <input
                      type="number"
                      min="0"
                      value={golesVisitante}
                      onChange={(event) =>
                        setGolesVisitante(event.target.value)
                      }
                      className="rounded-xl border border-slate-300 p-3 text-center text-xl font-black"
                    />
                  </div>

                  <div className="mt-5">
                    <label className="text-sm font-black uppercase text-slate-500">
                      Estado
                    </label>
                    <select
                      value={estado}
                      onChange={(event) => setEstado(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                    >
                      <option>Pendiente</option>
                      <option>En juego</option>
                      <option>Finalizado</option>
                      <option>Cerrado</option>
                    </select>
                  </div>

                  <label className="mt-5 flex items-center justify-between rounded-2xl bg-slate-100 p-4 font-black">
                    <span>Abrir votación MVP</span>
                    <input
                      type="checkbox"
                      checked={mvpOpen}
                      onChange={(event) => setMvpOpen(event.target.checked)}
                      className="h-6 w-6"
                    />
                  </label>

                  <button
                    onClick={guardarResultado}
                    className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                  >
                    Guardar resultado
                  </button>

                  {mensaje && (
                    <div className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm font-bold text-emerald-800">
                      {mensaje}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}