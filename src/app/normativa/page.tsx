import { rules } from "@/data/demo";

export default function NormativaPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
        <div className="rounded-3xl bg-black/55 p-6 text-white shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-emerald-200">
            Torneo verano 2026
          </p>
          <h1 className="mt-2 text-3xl font-bold">Normativa</h1>
          <p className="mt-2 text-emerald-100">
            Reglas básicas del torneo.
          </p>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto rounded-3xl bg-white/90 p-4 text-slate-900 shadow-2xl backdrop-blur">
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={rule} className="rounded-2xl bg-white p-4 shadow">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
                    {index + 1}
                  </div>

                  <p className="font-semibold leading-relaxed">{rule}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}