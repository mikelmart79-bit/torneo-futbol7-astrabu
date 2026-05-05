"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AdminGuardProps = {
  children: ReactNode;
};

export default function AdminGuard({ children }: AdminGuardProps) {
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    comprobarAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      comprobarAdmin();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function comprobarAdmin() {
    setLoading(true);
    setMensaje("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setEmail("");
      setAutorizado(false);
      setMensaje("No has iniciado sesión.");
      setLoading(false);
      return;
    }

    setEmail(user.email ?? "");

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      setAutorizado(false);
      setMensaje("Tu usuario no tiene perfil de permisos configurado.");
      setLoading(false);
      return;
    }

    const rol = String(data.role ?? "").toLowerCase();
    const esAdmin = rol === "admin" || rol === "superadmin";

    setAutorizado(esAdmin);

    if (!esAdmin) {
      setMensaje("Tu usuario no tiene permisos de administrador.");
    }

    setLoading(false);
  }

  async function salir() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const loginUrl = `/login?redirect=${encodeURIComponent(pathname || "/admin")}`;

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-white">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />

        <section className="relative z-10 mx-auto max-w-md px-4 py-10">
          <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
            <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
              Torneo Fútbol 7 Astrabudua
            </p>

            <h1 className="mt-2 text-center text-3xl font-black">
              Comprobando acceso...
            </h1>

            <p className="mt-3 text-center text-sm font-bold text-emerald-100">
              Validando permisos de administrador.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!autorizado) {
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
              Zona privada
            </p>

            <h1 className="mt-2 text-center text-3xl font-black">
              Acceso restringido
            </h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Necesitas iniciar sesión con un usuario administrador.
            </p>
          </div>

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            {email ? (
              <p className="break-words font-bold text-slate-700">
                Usuario actual: {email}
              </p>
            ) : (
              <p className="font-bold text-slate-700">
                No has iniciado sesión.
              </p>
            )}

            {mensaje && (
              <div className="mt-4 rounded-xl bg-red-100 p-3 text-sm font-bold text-red-700">
                {mensaje}
              </div>
            )}

            <a
              href={loginUrl}
              className="mt-5 block w-full rounded-xl bg-red-600 py-3 text-center font-black text-white shadow"
            >
              Ir a login
            </a>

            {email && (
              <button
                onClick={salir}
                className="mt-3 w-full rounded-xl bg-slate-900 py-3 text-center font-black text-white shadow"
              >
                Cerrar sesión
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="fixed right-3 top-3 z-50">
        <button
          onClick={salir}
          className="rounded-full bg-black/80 px-3 py-2 text-xs font-black text-white shadow backdrop-blur"
        >
          Salir admin
        </button>
      </div>

      {children}
    </>
  );
}