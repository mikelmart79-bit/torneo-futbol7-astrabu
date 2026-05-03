"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string;
};

export default function EquiposPage() {
  const grupos = ["Grupo A", "Grupo B", "Grupo C", "Grupo D"];
  const [grupoAbierto, setGrupoAbierto] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarEquipos() {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .order("group_name", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Error cargando equipos:", error);
      } else {
        setTeams(data ?? []);
      }

      setLoading(false);
    }

    cargarEquipos();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-20">
        <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-emerald-200">
            Torneo verano 2026
          </p>
          <h1 className="mt-2 text-3xl font-black">Equipos</h1>
          <p className="mt-2 text-emerald-100">
            Equipos participantes por grupos.
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Cargando equipos...
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {grupos.map((grupo) => {
              const abierto = grupoAbierto === grupo;
              const equiposGrupo = teams.filter(
                (team) => team.group_name === grupo
              );

              return (
                <div key={grupo} className="rounded-2xl bg-white/95 shadow">
                  <button
                    onClick={() => setGrupoAbierto(abierto ? "" : grupo)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div>
                      <p className="text-lg font-black">{grupo}</p>
                      <p className="text-sm text-slate-500">
                        {equiposGrupo.length} equipos
                      </p>
                    </div>

                    <span className="text-2xl font-black text-red-600">
                      {abierto ? "−" : "+"}
                    </span>
                  </button>

                  {abierto && (
                    <div className="space-y-3 border-t border-slate-100 p-4 pt-3">
                      {equiposGrupo.map((team) => (
                        <Link
                          href={`/equipos/${team.id}`}
                          key={team.id}
                          className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition active:scale-[0.98]"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-red-600">
                            {team.name.slice(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <p className="font-bold">{team.name}</p>
                            <p className="text-sm text-slate-500">
                              {team.group_name}
                            </p>
                          </div>
                        </Link>
                      ))}
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