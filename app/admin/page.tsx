"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";

export default function AdminRoutePage() {
  const router = useRouter();

  return (
    <main className="h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      <div className="w-full h-full flex gap-6 px-6 py-6">
        {/* SIDEBAR */}
        <aside
          className={`
            hidden md:flex flex-col
            bg-white/90 border border-slate-200 shadow-xl rounded-3xl
            px-3 py-4
            w-64
          `}
        >
          {/* HEADER LOGO */}
          <div className="flex items-center gap-3 px-2 pb-4 border-b border-slate-200">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500 text-sm font-bold text-white shadow">
              EKA
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight text-slate-800">
                EKA – Gestión Comercial
              </p>
              <p className="text-[11px] text-slate-400">
                Log de Cotizaciones &amp; Reqs.
              </p>
            </div>
          </div>

          {/* NAV */}
          <nav className="flex-1 mt-3 space-y-1 text-xs w-full">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
              type="button"
              onClick={() => router.push("/cotizaciones")}
            >
              <span className="text-lg">📄</span>
              <span>Log de Cotizaciones</span>
            </button>

            <button
              className="
                w-full flex items-center gap-3 px-3 py-2 rounded-xl
                bg-gradient-to-r from-violet-500 to-fuchsia-500
                text-white shadow-sm
              "
              type="button"
            >
              <span className="text-lg">⚙️</span>
              <span>Administrador</span>
            </button>
          </nav>
        </aside>

        {/* CONTENIDO ADMIN */}
        <section className="flex-1">
          <AdminPage />
        </section>
      </div>
    </main>
  );
}
