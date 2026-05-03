import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <img
        src="/torneo-verano.png"
        alt="Fondo"
        className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm"
      />

      <section className="relative z-10 w-full max-w-md px-5">
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <img
            src="/torneo-verano.png"
            alt="Torneo Verano 2026 Astrabudua"
            className="h-auto w-full object-contain"
          />

          <div className="absolute inset-x-0 bottom-64 flex justify-center">
            <Link
              href="/inicio"
              className="rounded-2xl bg-white px-10 py-3 text-lg font-black text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            >
              Entrar al torneo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}