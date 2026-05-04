"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/inicio";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modoRegistro, setModoRegistro] = useState(false);

  async function handleAuth() {
    setMensaje("");

    if (modoRegistro) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMensaje(error.message);
      } else {
        setMensaje("Usuario creado. Ya puedes iniciar sesión.");
        setModoRegistro(false);
      }

      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMensaje("Credenciales incorrectas");
      return;
    }

    window.location.href = redirectTo;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl bg-black/60 p-6 text-white shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-black">
            {modoRegistro ? "Crear cuenta" : "Iniciar sesión"}
          </h1>
          <p className="mt-2 text-emerald-100">
            Accede para votar MVP y gestionar el torneo.
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-3 w-full rounded-xl border p-3"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-3 w-full rounded-xl border p-3"
          />

          <button
            onClick={handleAuth}
            className="w-full rounded-xl bg-red-600 py-3 font-black text-white"
          >
            {modoRegistro ? "Crear cuenta" : "Entrar"}
          </button>

          <button
            onClick={() => setModoRegistro(!modoRegistro)}
            className="mt-3 w-full text-sm font-bold text-slate-600"
          >
            {modoRegistro ? "Ya tengo cuenta" : "Crear cuenta nueva"}
          </button>

          {mensaje && (
            <div className="mt-3 text-sm font-bold text-red-600">
              {mensaje}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}