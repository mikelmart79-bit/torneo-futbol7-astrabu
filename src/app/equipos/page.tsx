"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string;
};

type Group = {
  id: string;
  name: string;
  sort_order: number;
};

export default function EquiposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [grupoAbierto, setGrupoAbierto] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const guardados = localStorage.getItem("equiposFavoritos");
    if (guardados) setFavoritos(JSON.parse(guardados));

    async function cargarDatos() {
      const { data: groupsData } = await supabase
        .from("groups")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true });

      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .order("group_name", { ascending: true })
        .order("name", { ascending: true });

      setTeams((teamsData ?? []) as Team[]);

      const grupos = (groupsData ?? []) as Group[];
      setGroups(grupos);

      if (grupos.length > 0) setGrupoAbierto(grupos[0].name);

      setLoading(false);
    }

    cargarDatos();
  }, []);

  function toggleFavorito(teamId: string) {
    const nuevosFavoritos = favoritos.includes(teamId)
      ? favoritos.filter((id) => id !== teamId)
      : [...favoritos, teamId];

    setFavoritos(nuevosFavoritos);
    localStorage.setItem("equiposFavoritos", JSON.stringify(nuevosFavoritos));
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
          <h1 className="mt-2 text-center text-3xl font-black">Equipos</h1>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando equipos...
          </div>
        ) : groups.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Todavía no hay grupos creados.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {groups.map((grupo) => {
              const abierto = grupoAbierto === grupo.name;
              const equiposGrupo = teams.filter(
                (team) => team.group_name === grupo.name
              );

              return (
                <div
                  key={grupo.id}
                  className="overflow-hidden rounded-2xl bg-white/95 shadow"
                >
                  <button
                    onClick={() => setGrupoAbierto(abierto ? "" : grupo.name)}
                    className={`flex w-full items-center justify-between p-4 text-left ${
                      abierto
                        ? "bg-red-600 text-white"
                        : "bg-white/95 text-slate-900"
                    }`}
                  >
                    <p className="text-lg font-black">{grupo.name}</p>
                    <span className="text-2xl font-black">
                      {abierto ? "−" : "+"}
                    </span>
                  </button>

                  {abierto && (
                    <div className="space-y-3 border-t border-slate-100 p-4 pt-3">
                      {equiposGrupo.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-500">
                          No hay equipos en este grupo.
                        </p>
                      ) : (
                        equiposGrupo.map((team) => {
                          const esFavorito = favoritos.includes(team.id);

                          return (
                            <div
                              key={team.id}
                              className="flex items-center justify-between rounded-xl bg-slate-50 p-4 shadow-sm"
                            >
                              <Link
                                href={`/equipos/${team.id}`}
                                className="flex-1 text-lg font-black text-slate-900"
                              >
                                {team.name}
                              </Link>

                              <button
                                onClick={() => toggleFavorito(team.id)}
                                className={`ml-3 flex h-11 w-11 items-center justify-center rounded-full text-xl font-black shadow ${
                                  esFavorito
                                    ? "bg-red-600 text-white"
                                    : "bg-white text-slate-400"
                                }`}
                              >
                                ★
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}