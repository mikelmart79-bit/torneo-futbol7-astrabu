"use client";

import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type AdminLink = {
  href: string;
  title: string;
  description: string;
  variant?: "primary" | "normal";
};

const principales: AdminLink[] = [
  {
    href: "/admin/fichas-partido",
    title: "Resultados y fichas de partido",
    description: "Marcador, jugadores, goles, tarjetas, sanciones y MVP.",
    variant: "primary",
  },
  {
    href: "/admin/sanciones",
    title: "Gestionar sanciones",
    description: "Crear sanciones manuales, cumplirlas o reactivarlas.",
  },
  {
    href: "/admin/gestionar-partidos",
    title: "Configurar partidos",
    description: "Crear, editar o eliminar partidos de clasificación.",
  },
  {
    href: "/admin/fase-final",
    title: "Configurar eliminatorias",
    description: "Crear y editar octavos, cuartos, semis, tercer puesto y final.",
  },
];

const datos: AdminLink[] = [
  {
    href: "/admin/equipos",
    title: "Gestionar equipos",
    description: "Añadir, editar o eliminar equipos.",
  },
  {
    href: "/admin/jugadores",
    title: "Gestionar jugadores",
    description: "Plantillas y dorsales.",
  },
];

const extras: AdminLink[] = [
  {
    href: "/admin/mvp",
    title: "Votaciones MVP",
    description: "Abrir, cerrar y revisar votaciones.",
  },
  {
    href: "/admin/normativa",
    title: "Editar normativa",
    description: "Crear y modificar reglas del torneo.",
  },
];

function AdminCard({ item }: { item: AdminLink }) {
  const principal = item.variant === "primary";

  return (
    <Link
      href={item.href}
      className={`block rounded-2xl p-5 shadow ${
        principal ? "bg-red-600 text-white" : "bg-white/95 text-slate-900"
      }`}
    >
      <p className="text-lg font-black leading-tight">{item.title}</p>

      <p
        className={`mt-1 text-sm font-bold ${
          principal ? "text-red-100" : "text-slate-500"
        }`}
      >
        {item.description}
      </p>
    </Link>
  );
}

export default function AdminPage() {
  async function borrarDatosTorneo() {
    const confirmar1 = window.confirm(
      "⚠️ Esto borrará TODOS los datos del torneo:\n\n- equipos\n- jugadores\n- partidos\n- fichas de partido\n- goles\n- tarjetas\n- sanciones\n- eliminatorias\n- votos MVP\n\n¿Quieres continuar?"
    );

    if (!confirmar1) return;

    const confirmar2 = window.confirm(
      "🚨 Última confirmación.\n\nEsta acción no se puede deshacer.\n\n¿Borrar todos los datos?"
    );

    if (!confirmar2) return;

    const { error } = await supabase.rpc("reset_torneo");

    if (error) {
      alert("No se han podido borrar los datos.");
      console.error(error);
      return;
    }

    alert("Datos del torneo borrados correctamente.");
    window.location.reload();
  }

  return (
    <AdminGuard>
      <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
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

            <h1 className="mt-2 text-center text-3xl font-black">
              Panel admin
            </h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Gestión del torneo
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-red-600">
                Operativa del torneo
              </p>

              <div className="space-y-3">
                {principales.map((item) => (
                  <AdminCard key={item.href} item={item} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">
                Datos base
              </p>

              <div className="space-y-3">
                {datos.map((item) => (
                  <AdminCard key={item.href} item={item} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">
                Contenido y MVP
              </p>

              <div className="space-y-3">
                {extras.map((item) => (
                  <AdminCard key={item.href} item={item} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border-2 border-red-600 bg-red-50 p-5 shadow-2xl">
            <p className="text-sm font-black uppercase tracking-widest text-red-700">
              Zona peligrosa
            </p>

            <p className="mt-2 text-sm font-bold text-red-900">
              Borra todos los datos del torneo para empezar pruebas desde cero.
            </p>

            <p className="mt-2 text-xs font-bold text-red-700">
              Se eliminarán equipos, jugadores, partidos, fichas, goles,
              tarjetas, sanciones, eliminatorias y votos MVP.
            </p>

            <button
              onClick={borrarDatosTorneo}
              className="mt-4 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
            >
              Borrar datos del torneo
            </button>
          </div>
        </section>
      </main>
    </AdminGuard>
  );
}