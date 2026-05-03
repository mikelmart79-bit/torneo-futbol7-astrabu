import Link from "next/link";

export default function MasPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-6">
        <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-emerald-200">
            Torneo verano 2026
          </p>
          <h1 className="mt-2 text-3xl font-black">Más</h1>
          <p className="mt-2 text-emerald-100">
            Información y gestión del torneo.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Link
            href="/equipos"
            className="block rounded-2xl bg-white/95 p-5 font-black shadow backdrop-blur"
          >
            Equipos
          </Link>

          <Link
            href="/normativa"
            className="block rounded-2xl bg-white/95 p-5 font-black shadow backdrop-blur"
          >
            Normativa
          </Link>

          <Link
            href="/admin"
            className="block rounded-2xl bg-red-600 p-5 font-black text-white shadow"
          >
            Panel admin
          </Link>
        </div>
      </section>
    </main>
  );
}