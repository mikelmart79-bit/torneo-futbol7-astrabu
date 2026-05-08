"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

export default function EquiposPage() {
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

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, group_name")
        .order("name", { ascending: true });

      if (teamsError) {
        setErrorCarga("No se han podido cargar los equipos.");
        setLoading(false);
        return;
      }

      setTeams((teamsData ?? []) as Team[]);
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

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Elige tus equipos favoritos
          </p>
        </div>

        <Link
          href="/inicio"
          className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
        >
          Volver al inicio
        </Link>

        {favoritos.length > 0 && (
          <Link
            href="/favoritos"
            className="mt-4 block rounded-2xl bg-red-600 p-4 text-center text-base font-black text-white shadow-2xl"
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
        ) : teams.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/95 p-5 font-bold shadow">
            Todavía no hay equipos creados.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur">
            <div className="bg-red-600 px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest">
                    Equipos participantes
                  </p>

                  <p className="mt-1 text-xs font-bold text-red-100">
                    Pulsa la estrella para seguirlos
                  </p>
                </div>

                <p className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">
                  {teams.length}
                </p>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {teams.map((team) => {
                const esFavorito = favoritos.includes(team.id);

                return (
                  <div
                    key={team.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl p-4 shadow-sm ${
                      esFavorito
                        ? "bg-red-50 ring-2 ring-red-200"
                        : "bg-slate-50"
                    }`}
                  >
                    <Link
                      href={`/equipos/${team.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="break-words text-xl font-black leading-tight text-slate-900">
                        {team.name}
                      </p>

                      <span className="mt-3 inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow">
                        Ver plantilla →
                      </span>
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
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}