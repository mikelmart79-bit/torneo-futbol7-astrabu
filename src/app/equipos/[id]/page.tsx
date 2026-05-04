"use client";

import Link from "next/link";
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
    <div className="relative h-8 w-9">
      <div
        className="absolute left-2 top-1 h-7 w-5 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute left-0 top-2 h-3 w-3 -rotate-12 rounded-sm ring-1 ring-black/20"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute right-0 top-2 h-3 w-3 rotate-12 rounded-sm ring-1 ring-black/20"
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
        <Link
          href="/equipos"
          className="mb-4 inline-block rounded-full bg-white/95 px-4 py-2 text-sm font-black text-red-600 shadow"
        >
          ← Volver a equipos
        </Link>

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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">Plantilla</h2>

            <div className="flex gap-2">
              <ShirtIcon color={colorLocal} />
              <ShirtIcon color={colorVisitante} />
            </div>
          </div>

          {jugadores.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
              Este equipo todavía no tiene jugadores añadidos.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4">
              {jugadores.map((player) => (
                <div
                  key={player.id}
                  className="relative overflow-hidden rounded-xl bg-[#f3ead8] p-2 shadow-lg ring-1 ring-black/10"
                >
                  <div className="relative rounded-lg border border-slate-400 bg-white p-2">
                    <div className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#f3ead8] text-lg shadow ring-1 ring-black/20">
                      ⚽
                    </div>

                    <p className="pl-10 text-right text-[10px] font-black uppercase tracking-widest text-slate-700">
                      {equipo.name}
                    </p>

                    <div className="mt-4 flex h-32 items-center justify-center overflow-hidden rounded-sm border border-slate-300 bg-gradient-to-b from-slate-100 to-slate-300">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-800 text-5xl font-black text-white shadow-inner">
                        {player.number}
                      </div>
                    </div>

                    <div className="mt-2 border-t border-slate-300 pt-2">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-500">
                            Dorsal
                          </p>
                          <p className="text-3xl font-black leading-none text-red-600">
                            {player.number}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">
                            Equipaciones
                          </p>
                          <div className="flex justify-end gap-2">
                            <ShirtIcon color={colorLocal} />
                            <ShirtIcon color={colorVisitante} />
                          </div>
                        </div>
                      </div>

                      <p className="mt-2 border-t border-slate-300 pt-2 text-center text-sm font-black uppercase leading-tight text-slate-900">
                        {player.name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}