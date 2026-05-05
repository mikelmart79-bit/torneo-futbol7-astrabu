"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function obtenerRedirectSeguro(redirect: string | null) {
  if (!redirect) return "/inicio";
  if (!redirect.startsWith("/")) return "/inicio";
  if (redirect.startsWith("//")) return "/inicio";

  return redirect;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = obtenerRedirectSeguro(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMensaje("");

    const emailLimpio = email.trim();

    if (!emailLimpio || !password) {
      setMensaje("Escribe email y contraseña.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: emailLimpio,
      password,
    });

    setLoading(false);

    if (error) {
      setMensaje("Credenciales incorrectas.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-slate-900">
      <img
        src="/torneo-verano.png"
        alt="Fondo torneo"
        className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
      />

      <section className="relative z-10 mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl bg-black/60 px-4 py-6 text-white shadow-2xl backdrop-blur">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            Torneo Fútbol 7 Astrabudua
          </p>

          <h1 className="mt-2 text-center text-3xl font-black">
            Iniciar sesión
          </h1>

          <p className="mt-2 text-center text-sm font-bold text-emerald-100">
            Acceso privado para administración del torneo.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur"
        >
          <div>
            <label className="text-sm font-black uppercase text-slate-500">
              Email
            </label>
            <input
              type="email"
              placeholder="admin@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-black uppercase text-slate-500">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:bg-slate-300"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {mensaje && (
            <div className="mt-4 rounded-xl bg-red-100 p-3 text-sm font-bold text-red-700">
              {mensaje}
            </div>
          )}
        </form>
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