"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PlayerType = "M" | "F";

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
  player_type: PlayerType | null;
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

function textoTipoJugador(tipo: PlayerType | null) {
  return tipo === "F" ? "Federado" : "Municipio";
}

export default function EquipoDetalle() {
  const params = useParams();
  const idParam = params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [equipo, setEquipo] = useState<Team | null>(null);
  const [jugadores, setJugadores] = useState<Player[]>([]);
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
      if (!id) {
        setEquipo(null);
        setErrorCarga("Equipo no encontrado.");
        setLoading(false);
        return;
      }

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

      setEquipo(teamData as Team);

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, team_id, name, number, player_type")
        .eq("team_id", id)
        .order("number", { ascending: true })
        .order("name", { ascending: true });

      if (playersError) {
        setErrorCarga("No se ha podido cargar la plantilla.");
        setLoading(false);
        return;
      }

      setJugadores((playersData ?? []) as Player[]);
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
            Equipo participante
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

            <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
              {jugadores.length}
            </p>
          </div>

          {jugadores.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
              Este equipo todavía no tiene jugadores añadidos.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {jugadores.map((player) => {
                const tipo = player.player_type === "F" ? "F" : "M";

                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 shadow-sm"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white">
                      {player.number ?? "-"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-lg font-black leading-tight">
                        {player.name}
                      </p>

                      <p className="mt-1 text-xs font-bold uppercase text-slate-500">
                        {textoTipoJugador(tipo)}
                      </p>
                    </div>

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black shadow ${
                        tipo === "F"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                      title={textoTipoJugador(tipo)}
                    >
                      {tipo}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}