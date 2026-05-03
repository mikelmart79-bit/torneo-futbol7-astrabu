import Link from "next/link";
import { players, teams } from "@/data/demo";

type Props = {
  params: Promise<{ id: string }>;
};

function getKitColors(teamId: string) {
  const kits: Record<string, { home: string; away: string }> = {
    a1: { home: "bg-emerald-600", away: "bg-white" },
    a2: { home: "bg-blue-700", away: "bg-white" },
    a3: { home: "bg-red-600", away: "bg-black" },
    a4: { home: "bg-yellow-400", away: "bg-emerald-700" },
  };

  return kits[teamId] ?? { home: "bg-emerald-600", away: "bg-red-600" };
}

function ShirtIcon({ color }: { color: string }) {
  return (
    <div className="relative h-8 w-9">
      <div className={`absolute left-2 top-1 h-7 w-5 rounded-sm ${color} ring-1 ring-black/20`} />
      <div className={`absolute left-0 top-2 h-3 w-3 -rotate-12 rounded-sm ${color} ring-1 ring-black/20`} />
      <div className={`absolute right-0 top-2 h-3 w-3 rotate-12 rounded-sm ${color} ring-1 ring-black/20`} />
    </div>
  );
}

export default async function EquipoDetalle({ params }: Props) {
  const { id } = await params;
  const equipo = teams.find((team) => team.id === id);
  const jugadoresEquipo = players.filter((player) => player.teamId === id);
  const kitColors = getKitColors(id);

  if (!equipo) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <p className="font-bold">Equipo no encontrado</p>
        <Link
          href="/equipos"
          className="mt-4 inline-block font-bold text-red-600"
        >
          Volver a equipos
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <section className="mx-auto max-w-md px-4 py-6">
        <Link
          href="/equipos"
          className="mb-4 inline-block font-bold text-red-600"
        >
          ← Volver a equipos
        </Link>

        <div className="rounded-3xl bg-emerald-700 p-6 text-white shadow-lg">
          <p className="text-sm uppercase tracking-widest text-emerald-100">
            {equipo.group}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{equipo.name}</h1>
          <p className="mt-2 text-emerald-100">Plantilla en formato cromo.</p>
        </div>

        <div className="mt-6">
          <h2 className="mb-4 text-xl font-black">Plantilla</h2>

          {jugadoresEquipo.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-slate-500">
                Este equipo todavía no tiene jugadores añadidos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {jugadoresEquipo.map((player) => (
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
                            <ShirtIcon color={kitColors.home} />
                            <ShirtIcon color={kitColors.away} />
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