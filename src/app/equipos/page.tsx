"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

type Group = {
  id: string;
  name: string;
  sort_order: number;
};

export default function EquiposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [grupoActivo, setGrupoActivo] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
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

    async function cargarDatos() {
      setLoading(true);
      setErrorCarga("");

      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true });

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .order("group_name", { ascending: true })
        .order("name", { ascending: true });

      if (groupsError || teamsError) {
        setErrorCarga("No se han podido cargar los equipos.");
        setLoading(false);
        return;
      }

      const grupos = (groupsData ?? []) as Group[];
      const equipos = (teamsData ?? []) as Team[];

      setGroups(grupos);
      setTeams(equipos);

      const primerGrupo =
        grupos[0]?.name ||
        equipos.find((team) => team.group_name)?.group_name ||
        "";

      setGrupoActivo(primerGrupo);
      setLoading(false);
    }

    cargarDatos();
  }, []);

  const gruposDisponibles = useMemo(() => {
    const gruposDesdeTabla = groups.map((group) => group.name);

    const gruposDesdeEquipos = Array.from(
      new Set(
        teams
          .map((team) => team.group_name)
          .filter((group): group is string => Boolean(group))
      )
    ).filter((group) => !gruposDesdeTabla.includes(group));

    return [...gruposDesdeTabla, ...gruposDesdeEquipos];
  }, [groups, teams]);

  const equiposGrupo = teams.filter((team) => team.group_name === grupoActivo);

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

        {favoritos.length > 0 && (
          <Link
            href="/favoritos"
            className="mt-5 block rounded-2xl bg-red-600 p-4 text-center text-base font-black text-white shadow-2xl"
          >
            Ver mis favoritos
          </Link>
        )}

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando equipos...
          </div>
        ) : errorCarga ? (
          <div className="mt-6 rounded-2xl bg-red-100 p-5 font-bold text-red-700 shadow">
            {errorCarga}
          </div>
        ) : gruposDisponibles.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Todavía no hay grupos creados.
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {gruposDisponibles.map((grupo) => (
                <button
                  key={grupo}
                  onClick={() => setGrupoActivo(grupo)}
                  className={`rounded-2xl px-4 py-4 text-sm font-black shadow ${
                    grupoActivo === grupo
                      ? "bg-red-600 text-white"
                      : "bg-white/95 text-slate-800"
                  }`}
                >
                  {grupo}
                </button>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
              <div className="bg-red-600 px-5 py-4 text-white">
                <p className="text-sm font-black uppercase tracking-widest">
                  {grupoActivo}
                </p>
              </div>

              <div className="space-y-3 p-4">
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
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 shadow-sm"
                      >
                        <Link
                          href={`/equipos/${team.id}`}
                          className="min-w-0 flex-1"
                        >
                          <p className="break-words text-lg font-black leading-tight text-slate-900">
                            {team.name}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            Ver plantilla
                          </p>
                        </Link>

                        <button
                          onClick={() => toggleFavorito(team.id)}
                          title={
                            esFavorito
                              ? "Quitar de favoritos"
                              : "Añadir a favoritos"
                          }
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-black shadow ${
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
            </div>
          </>
        )}
      </section>
    </main>
  );
}