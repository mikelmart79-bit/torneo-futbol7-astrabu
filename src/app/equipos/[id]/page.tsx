"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string;
  home_color: string | null;
  away_color: string | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number;
};

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
  const id = params.id as string;

  const [equipo, setEquipo] = useState<Team | null>(null);
  const [jugadores, setJugadores] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarEquipo() {
      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name, group_name, home_color, away_color")
        .eq("id", id)
        .single();

      const { data: playersData } = await supabase
        .from("players")
        .select("id, team_id, name, number")
        .eq("team_id", id)
        .order("number", { ascending: true });

      setEquipo((teamData as Team) ?? null);
      setJugadores((playersData ?? []) as Player[]);
      setLoading(false);
    }

    cargarEquipo();
  }, [id]);

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-white">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />
        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-white/95 p-5 font-bold text-slate-900 shadow">
            Cargando equipo...
          </div>
        </section>
      </main>
    );
  }

  if (!equipo) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-white">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />
        <section className="relative z-10 mx-auto max-w-md px-4 py-6">
          <div className="rounded-3xl bg-white/95 p-5 text-slate-900 shadow">
            <p className="font-bold">Equipo no encontrado.</p>
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
            {equipo.name}
          </h1>
          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            {equipo.group_name}
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <h2 className="text-xl font-black">Equipaciones</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center shadow">
              <div className="flex justify-center">
                <ShirtIcon color={colorLocal} />
              </div>
              <p className="mt-2 text-sm font-black text-slate-700">
                Local
              </p>
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
          <div className="flex items-center justify-between">
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
                    {player.number}
                  </div>

                  <p className="text-lg font-black leading-tight">
                    {player.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}