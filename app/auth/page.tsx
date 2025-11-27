"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AuthMode = "login" | "register";

/**
 * Crea o actualiza el perfil en public.profiles usando user_id como clave única.
 */
async function ensureProfile(userId: string, email: string | null) {
  if (!userId) return;

  const safeEmail = email ?? "";

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        email: safeEmail,
        role: "user",    // puedes cambiar el rol por defecto
        is_active: true, // o false si quieres aprobarlos primero
      },
      {
        onConflict: "user_id",
      }
    );

  if (error) {
    console.error("Error creando/actualizando profile:", error);
  }
}

export default function AuthPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 🔍 1. Al entrar a /auth, si ya hay sesión => ir a /cotizaciones
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getSession:", error);
        }
        if (data.session?.user) {
          const user = data.session.user;
          // Aseguramos que tenga perfil
          await ensureProfile(user.id, user.email ?? null);
          router.replace("/cotizaciones");
          return;
        }
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  // Mientras verifico sesión, solo muestro un loader simple
  if (checkingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
        <p className="text-sm text-slate-500">Verificando acceso…</p>
      </main>
    );
  }

  // 🔐 2. Manejo de login / registro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Error signIn:", error);
          setMessage("❌ Credenciales incorrectas o usuario no existe.");
          return;
        }

        const user = data.user;
        if (user) {
          // ✅ nos aseguramos de que exista su fila en profiles
          await ensureProfile(user.id, user.email ?? email);
        }

        router.replace("/cotizaciones");
      } else {
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Después de confirmar correo, que vuelva a /auth
            emailRedirectTo: `${siteUrl}/auth`,
          },
        });

        if (error) {
          console.error("Error signUp:", error);
          setMessage("❌ No se pudo registrar el usuario.");
          return;
        }

        const user = data.user;
        // Si no tienes confirmación obligatoria por correo, user suele venir lleno.
        // Si sí tienes confirmación, el perfil se podrá crear luego de su primer login.
        if (user) {
          await ensureProfile(user.id, user.email ?? email);
        }

        setMessage(
          "✅ Usuario registrado. Revisa tu correo y vuelve a ingresar por esta misma página."
        );
        setMode("login");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white/90 shadow-2xl border border-white/60 px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Acceso a Gestión Comercial
        </h1>
        <p className="text-xs text-slate-500 text-center mb-6">
          Inicia sesión para usar el Log de Cotizaciones y formularios.
        </p>

        {/* Tabs login / registro */}
        <div className="flex mb-6 text-xs font-semibold rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              mode === "login"
                ? "bg-white shadow text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              mode === "register"
                ? "bg-white shadow text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500 bg-white"
              placeholder="tucorreo@empresa.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500 bg-white"
              placeholder="••••••••"
            />
          </div>

          {/* Mensaje */}
          {message && (
            <div className="text-[11px] mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full inline-flex items-center justify-center rounded-xl bg-blue-600 text-white text-sm font-semibold py-2.5 shadow-md hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading
              ? "Procesando…"
              : mode === "login"
              ? "Entrar"
              : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-center text-slate-400">
          Más adelante aquí se puede agregar recuperación de contraseña y
          gestión de roles por pestañas.
        </p>
      </div>
    </main>
  );
}
