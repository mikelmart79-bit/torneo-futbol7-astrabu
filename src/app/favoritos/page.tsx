"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

export default function FavoritosPage() {
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    const guardados = localStorage.getItem("equiposFavoritos");
    const ids = guardados ? JSON.parse(guardados) : [];
    setFavoritos(ids);

    async function cargarEquipos() {
      const { data } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .order("name", { ascending: true });

      setTeams((data ?? []) as Team[]);
    }

    cargarEquipos();
  }, []);

  const equiposFavoritos = teams.filter((team) => favoritos.includes(team.id));

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
          <h1 className="mt-2 text-center text-3xl font-black">Favoritos</h1>
        </div>

        <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl">
          {equiposFavoritos.length === 0 ? (
            <p className="text-sm font-bold text-slate-500">
              Todavía no tienes equipos favoritos. Entra en Equipos y pulsa la
              estrella para seguirlos.
            </p>
          ) : (
            <div className="space-y-3">
              {equiposFavoritos.map((team) => (
                <div
                  key={team.id}
                  className="rounded-2xl bg-slate-50 p-4 shadow-sm"
                >
                  <p className="text-lg font-black">{team.name}</p>
                  <p className="text-sm font-bold text-slate-500">
                    {team.group_name}
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