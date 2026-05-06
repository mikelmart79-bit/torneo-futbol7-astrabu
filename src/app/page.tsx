import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden bg-black">
      <img
        src="/torneo-verano.png"
        alt="Fondo"
        className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm"
      />

      <section className="relative z-10 flex h-full w-full max-w-md items-center justify-center px-5 pb-20 pt-4">
        <div className="relative flex h-full max-h-[calc(100svh-96px)] w-full items-center justify-center overflow-hidden rounded-3xl shadow-2xl">
          <img
            src="/torneo-verano.png"
            alt="Torneo Verano 2026 Astrabudua"
            className="h-full max-h-[calc(100svh-96px)] w-auto max-w-full object-contain"
          />

          <div className="absolute inset-x-0 bottom-[29%] flex justify-center px-8">
            <Link
              href="/inicio"
              className="rounded-2xl bg-white px-9 py-3 text-lg font-black text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            >
              Entrar al torneo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}