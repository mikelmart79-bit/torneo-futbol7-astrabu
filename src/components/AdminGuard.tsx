"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    comprobarAdmin();
  }, []);

  async function comprobarAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setAutorizado(false);
      return;
    }

    setEmail(user.email ?? "");

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!error && data?.role === "admin") {
      setAutorizado(true);
    } else {
      setAutorizado(false);
    }

    setLoading(false);
  }

  async function salir() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-white">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />
        <section className="relative z-10 mx-auto max-w-md px-4 py-10">
          <div className="rounded-3xl bg-black/60 p-6 shadow-2xl backdrop-blur">
            <h1 className="text-3xl font-black">Comprobando acceso...</h1>
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

        <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-20">
          <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
            <p className="text-sm uppercase tracking-widest text-emerald-200">
              Zona privada
            </p>
            <h1 className="mt-2 text-3xl font-black">Acceso restringido</h1>
            <p className="mt-2 text-emerald-100">
              Necesitas iniciar sesión con un usuario administrador.
            </p>
          </div>

          <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
            {email ? (
              <p className="font-bold text-slate-700">
                Usuario actual: {email}
              </p>
            ) : (
              <p className="font-bold text-slate-700">
                No has iniciado sesión.
              </p>
            )}

            <a
              href="/login?redirect=/admin"
              className="mt-5 block w-full rounded-xl bg-red-600 py-3 text-center font-black text-white shadow"
            >
              Ir a login
            </a>
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
          className="rounded-full bg-black/70 px-3 py-2 text-xs font-black text-white shadow backdrop-blur"
        >
          Salir admin
        </button>
      </div>

      {children}
    </>
  );
}