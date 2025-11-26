"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setLoading(true);

    try {
      // 1) Crear usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error("No se pudo obtener el usuario creado.");

      // 2) Crear/actualizar registro en tabla profiles (ajusta el nombre)
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        nombre: nombre || null,
        // por defecto todos serán "user". Luego tú cambias a "admin" en el panel.
        rol: "user",
      });

      if (profileError) throw profileError;

      setMensaje(
        "✅ Usuario registrado. Revisa tu correo si Supabase envía confirmación."
      );

      // Opcional: redirigir al login después de unos segundos
      setTimeout(() => {
        router.push("/auth");
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setMensaje("❌ Error al registrar: " + (err.message ?? "desconocido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      <div className="w-full max-w-md bg-white/90 border border-slate-200 rounded-3xl shadow-xl px-8 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Crear cuenta
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Regístrate para usar el panel de cotizaciones.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleRegister}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Nombre
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-[1.5px] focus:ring-blue-200"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellidos"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Correo</label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-[1.5px] focus:ring-blue-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="correo@empresa.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-[1.5px] focus:ring-blue-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Registrando…" : "Registrarme"}
          </button>
        </form>

        {mensaje && (
          <p className="text-xs text-center text-slate-600 whitespace-pre-line">
            {mensaje}
          </p>
        )}

        <button
          type="button"
          onClick={() => router.push("/auth")}
          className="w-full text-[11px] text-blue-600 hover:text-blue-800 mt-2"
        >
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      </div>
    </main>
  );
}
