"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";      // 👈 nuevo
import type { User } from "@supabase/supabase-js"; // 👈 nuevo
import { supabase } from "@/lib/supabaseClient";
import { NuevaCotizacion } from "@/components/cotizaciones/NuevaCotizacion";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  getPermissionsForRole,
  applyOverrides,
  LOG_COLUMNS,
  type SectionKey,
  type LogColumnKey,
  type PermissionOverrides,
  type Role,
} from "@/lib/permissions";
import { AdminPage as AdminUsersPanel } from "@/components/admin/AdminPage";



/* --------- Helpers --------- */

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE");
}

function boolLabel(v: boolean | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v ? "Sí" : "No";
}

const ADMIN_EMAIL = "edwin.qm@outlook.com";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
  permissions: any | null;   // 👈 nuevo
}


/* ======================= PÁGINA ======================= */

export default function LogCotizacionesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
 const [view, setView] = useState<"log" | "detalleReqs" | "admin">("log");

  const [perfil, setPerfil] = useState<ProfileRow | null>(null);
  // -------- Detalle de Requerimientos ----------
const [detalleRows, setDetalleRows] = useState<any[]>([]);
const [detalleLoading, setDetalleLoading] = useState(false);
const [detalleError, setDetalleError] = useState<string | null>(null);

const fetchDetalleReqs = async () => {
  setDetalleLoading(true);
  setDetalleError(null);

  const { data, error } = await supabase
    .from("Detalle de Requerimientos") // 👈 nombre tal cual en Supabase
    .select("*")
    .order("id", { ascending: false }); // si no tienes id, luego cambiamos

  if (error) {
    console.error("Supabase error Detalle de Requerimientos:", error);
    setDetalleError(
      "Error al cargar el Detalle de Requerimientos: " + error.message
    );
    setDetalleRows([]);
  } else {
    setDetalleRows(data || []);
  }

  setDetalleLoading(false);
};


  // Modal Nueva / Editar
  const [isNuevaOpen, setIsNuevaOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
const basePerms = getPermissionsForRole(
  (perfil?.role ?? null) as Role
);

const perms = applyOverrides(
  basePerms,
  (perfil?.permissions ?? null) as PermissionOverrides | null
);

const canSeeSection = (section: SectionKey) =>
  perms.sections.includes(section);

const canSeeColumn = (col: LogColumnKey) =>
  perms.logColumns.includes(col);

const canCreateQuote = perms.canCreateQuote;
const canEditQuote = perms.canEditQuote;


  // Crea el profile si no existe aún en la tabla "profiles"
  const ensureProfileForUser = async (user: User) => {
    try {
      // ¿Ya existe un profile con este user_id?
      const { data: perfiles, error: profError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (profError) {
        console.error("Error verificando profiles:", profError);
        return;
      }

      const yaExiste = perfiles && perfiles.length > 0;
      if (yaExiste) return;

      // Si no existe, lo creamos
      const fullName =
        (user.user_metadata as any)?.full_name ??
        (user.user_metadata as any)?.name ??
        null;

        const { error: insertErr } = await supabase.from("profiles").insert({
          user_id: user.id,
          email: user.email,
          full_name: fullName,
          display_name: fullName ?? user.email,
          role: "pending",     // 👈 NUEVO: rol pendiente
          is_active: false,    // 👈 NUEVO: desactivado hasta que lo apruebes
        });


        if (insertErr) {
        console.warn("Error creando profile:", insertErr);
      }
    } catch (e) {
      console.error("Error inesperado en ensureProfileForUser:", e);
    }
  };

  
  // 🔁 para recargar la tabla después de guardar
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("Log de Cotizaciones")
      .select("*")
      .order("fecha_registro", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      setErrorMsg("Error al cargar el Log de Cotizaciones: " + error.message);
      setRows([]);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  };

  // Carga inicial
  const router = useRouter();

  // Carga inicial: validar sesión y cargar data
  useEffect(() => {
  const checkSessionAndLoad = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      router.push("/auth");
      return;
    }

    const user = data.user;
    setCurrentUser(user);

    // 1) Crea profile si no existe (tu función anterior)
    await ensureProfileForUser(user);

    // 2) Leer profile con rol y estado
    const { data: perfilRow, error: perfilError } = await supabase
      .from("profiles")
      .select(
        "id, user_id, email, full_name, display_name, role, is_active, created_at, permissions"
      )
      .eq("user_id", user.id)
      .maybeSingle();


    if (perfilError) {
      console.error("Error leyendo perfil:", perfilError);
      setErrorMsg("No se pudo leer tu perfil de usuario.");
      setLoading(false);
      return;
    }

    if (!perfilRow) {
      setErrorMsg("Tu perfil no está configurado. Contacta al administrador.");
      setLoading(false);
      return;
    }

    const perfilNormalizado: ProfileRow = {
      id: perfilRow.id,
      email: perfilRow.email,
      full_name:
        perfilRow.display_name ??
        perfilRow.full_name ??
        perfilRow.email ??
        null,
      role: perfilRow.role,
      is_active: perfilRow.is_active,
      created_at: perfilRow.created_at,
      permissions: perfilRow.permissions ?? null,
    };

    setPerfil(perfilNormalizado);

    // 3) Bloquear acceso si está pendiente o inactivo
    if (
      perfilNormalizado.role === "pending" ||
      perfilNormalizado.is_active === false
    ) {
      setErrorMsg(
        "Tu cuenta está en revisión o bloqueada. Consulta con el administrador."
      );
      setLoading(false);
      return;
    }

    // 4) Finalmente carga el log de cotizaciones
    await fetchData();
  };

  checkSessionAndLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
  if (view === "detalleReqs") {
    fetchDetalleReqs();
  }
}, [view]);




  const toggleExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const openNueva = () => {
    setEditingRow(null);
    setIsNuevaOpen(true);
  };

  const openEditar = (row: any) => {
    setEditingRow(row);
    setIsNuevaOpen(true);
  };

  const closeModal = () => {
    setIsNuevaOpen(false);
    setEditingRow(null);
  };

  // Cuando se guarda una cotización desde el modal
  const handleSaved = async () => {
    closeModal();
    await fetchData(); // recarga la tabla
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  const goAdmin = () => {
    router.push("/admin");
  };

// 🔒 Bloquear scroll del body y del html cuando el modal está abierto
useEffect(() => {
  const originalBodyOverflow = document.body.style.overflow;
  const originalHtmlOverflow = document.documentElement.style.overflow;

  if (isNuevaOpen) {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  } else {
    document.body.style.overflow = originalBodyOverflow || "";
    document.documentElement.style.overflow = originalHtmlOverflow || "";
  }

  return () => {
    document.body.style.overflow = originalBodyOverflow || "";
    document.documentElement.style.overflow = originalHtmlOverflow || "";
  };
  
}, [isNuevaOpen]);


  
  return (
    <main className="h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      {/* Márgenes iguales alrededor */}
      <div className="w-full h-full flex gap-6 px-6 py-6">
        {/* ---------------- SIDEBAR ---------------- */}
        {/* ---------------- SIDEBAR ---------------- */}
<aside
  className={`
    hidden md:flex flex-col
    bg-white/90 border border-slate-200 shadow-xl rounded-3xl
    px-3 py-4
    transition-all duration-300
    ${sidebarCollapsed ? "w-20 items-center" : "w-64"}
  `}
>
  {/* HEADER LOGO */}
  <div
    className={`
      flex items-center gap-3 px-2 pb-4 border-b border-slate-200
      ${sidebarCollapsed ? "justify-center" : ""}
    `}
  >
    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500 text-sm font-bold text-white shadow">
      EKA
    </div>

    {!sidebarCollapsed && (
      <div>
        <p className="text-xs font-semibold leading-tight text-slate-800">
          EKA – Gestión Comercial
        </p>
        <p className="text-[11px] text-slate-400">
          Log de Cotizaciones &amp; Reqs.
        </p>
      </div>
    )}
  </div>

  {/* NAV PRINCIPAL */}
  <nav className="flex-1 mt-3 space-y-1 text-xs w-full">
    {/* Dashboard */}
{canSeeSection("dashboard") && (
  <button
    className={`
      w-full flex items-center gap-3 px-3 py-2 rounded-xl
      hover:bg-slate-100 text-slate-600 transition
      ${sidebarCollapsed ? "justify-center" : ""}
    `}
    type="button"
  >
    <span className="text-lg">🏠</span>
    {!sidebarCollapsed && <span>Dashboard</span>}
  </button>
)}

{/* Log de Cotizaciones */}
{canSeeSection("log") && (
  <button
    className={`
      w-full flex items-center gap-3 px-3 py-2 rounded-xl
      ${
        view === "log"
          ? "bg-blue-600 text-white shadow-sm"
          : "hover:bg-slate-100 text-slate-600"
      }
      transition
      ${sidebarCollapsed ? "justify-center" : ""}
    `}
    type="button"
    onClick={() => setView("log")}
  >
    <span className="text-lg">📄</span>
    {!sidebarCollapsed && <span>Log de Cotizaciones</span>}
  </button>

)}

{/* Requerimientos */}
{canSeeSection("requerimientos") && (
  <button
    className={`
      w-full flex items-center gap-3 px-3 py-2 rounded-xl
      hover:bg-slate-100 text-slate-600 transition
      ${sidebarCollapsed ? "justify-center" : ""}
    `}
    type="button"
  >
    <span className="text-lg">📦</span>
    {!sidebarCollapsed && <span>Requerimientos</span>}
  </button>
)}

{/* Detalle Reqs */}
{canSeeSection("detalle_reqs") && (
    <button
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-xl
        ${
          view === "detalleReqs"
            ? "bg-blue-600 text-white shadow-sm"
            : "hover:bg-slate-100 text-slate-600"
        }
        transition
        ${sidebarCollapsed ? "justify-center" : ""}
      `}
      type="button"
      onClick={() => setView("detalleReqs")}
    >
      <span className="text-lg">📝</span>
      {!sidebarCollapsed && <span>Detalle Reqs.</span>}
    </button>
)}

  </nav>

  {/* ZONA INFERIOR: CONTRAER, CERRAR SESIÓN, ADMIN */}
  <div className="mt-auto pt-3 border-t border-slate-200 space-y-3 w-full">
    {/* Contraer / Expandir menú */}
    <button
      type="button"
      onClick={() => setSidebarCollapsed((prev) => !prev)}
      className={`
        w-full flex items-center ${sidebarCollapsed ? "justify-center" : "justify-center md:justify-center"}
        gap-2 rounded-xl bg-slate-100 text-[11px] text-slate-600 py-2 hover:bg-slate-200 transition
      `}
    >
      <span className="text-sm">{sidebarCollapsed ? "⮞" : "⮜"}</span>
      {!sidebarCollapsed && <span>Contraer menú</span>}
    </button>

    {/* Cerrar sesión */}
    <button
      type="button"
      onClick={handleLogout}
      className={`
        w-full flex items-center gap-2
        rounded-2xl bg-slate-900 text-[11px] text-slate-100 py-2 px-3
        hover:bg-black transition shadow-sm
        ${sidebarCollapsed ? "justify-center" : "justify-center md:justify-center"}
      `}
    >
      <span className="text-sm">⏻</span>
      {!sidebarCollapsed && <span>Cerrar sesión</span>}
    </button>

{canSeeSection("admin") && (
    <button
      type="button"
      onClick={() => setView("admin")}
      className={`w-full flex items-center gap-3 rounded-2xl text-[11px] py-2.5 px-3 shadow-md hover:shadow-lg hover:brightness-110 transition
        ${
          view === "admin"
            ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
            : "bg-gradient-to-r from-slate-200 to-slate-100 text-slate-700"
        }
      `}
    >
      <span className="text-lg">⚙️</span>
      {!sidebarCollapsed && (
        <div className="flex flex-col items-start">
          <span className="font-semibold text-[12px]">Administrador</span>
          <span className="text-[10px] opacity-85">
            Usuarios, permisos y accesos
          </span>
        </div>
      )}
    </button>


)}

        </div>
      </aside>



{/* ---------------- CONTENIDO PRINCIPAL ---------------- */}
<section className="flex-1">
  {view === "log" ? (
    <>
      {/* CARD PRINCIPAL IGUAL A ADMIN */}
      <div className="flex flex-col h-full bg-white/90 border border-slate-200 rounded-3xl shadow-xl">
        {/* HEADER igual que Administrador */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">
              Log de Cotizaciones
            </h1>
            <p className="text-[11px] text-slate-500">
              Registro centralizado de todas las cotizaciones del sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={openNueva}
            className="text-[11px] px-3 py-1.5 rounded-full bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 transition"
          >
            Nueva Cotización
          </button>
        </div>

        {/* CONTENIDO (mismo patrón que Admin: flex-1 + p-4) */}
        <div className="flex-1 p-4 overflow-auto">
          {/* ERROR */}
          {errorMsg && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}

          {/* TABLA / CONTENIDO */}
          {loading ? (
            <p className="text-sm text-slate-500">Cargando registros…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay cotizaciones registradas todavía.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="min-w-full text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">
                      Cotización
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Descripción
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Cliente
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Unidad minera
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Tipo servicio
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Status cotización
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Status proyecto
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Oferta (USD)
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Moneda
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Detalle / Editar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const statusCot =
                      r.estado_cotizacion || r.status_cotizacion || "—";
                    const ofertaUsd =
                      r.oferta_usd ?? r.moneda_normalizada_usd ?? null;
                    const isExpanded = expandedRowId === r.id;

                    return (
                      <React.Fragment key={r.id}>
                        <tr
                          className={
                            idx % 2 === 0
                              ? "bg-white"
                              : "bg-slate-50/60 border-t border-slate-100"
                          }
                        >
                          <td className="px-3 py-2 font-mono text-[11px]">
                            {r.cotizacion}
                          </td>
                          <td className="px-3 py-2 max-w-xs">
                            <span className="text-[11px] text-slate-700 line-clamp-2">
                              {r.descripcion || (
                                <span className="text-slate-400">—</span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {r.cliente || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {r.unidad_minera || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {r.tipo_servicio || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">{statusCot}</td>
                          <td className="px-3 py-2">
                            {r.status_proyecto || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {ofertaUsd !== null
                              ? ofertaUsd.toLocaleString("es-PE", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {r.moneda || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleExpand(r.id)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              >
                                {isExpanded ? "Ocultar" : "Ver detalle"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditar(r)}
                                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                                title="Editar cotización"
                              >
                                <span className="text-xs mr-1">✏️</span>
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={10}
                              className="bg-slate-50 border-t border-slate-200 px-4 py-4"
                            >
                              {/* ... panel de detalle igual que ya tenías ... */}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVA / EDITAR COTIZACIÓN */}
      {isNuevaOpen && (
        <NuevaCotizacionModal
          mode={editingRow ? "edit" : "new"}
          row={editingRow}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </>
    
  ) : view === "detalleReqs" ? (
    <>
      {/* ---- DETALLE DE REQUERIMIENTOS ---- */}
      <div className="flex flex-col h-full bg-white/90 border border-slate-200 rounded-3xl shadow-xl">
        {/* Header igual estilo que Admin y Log */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">
              Detalle de Requerimientos
            </h1>
            <p className="text-[11px] text-slate-500">
              Listado de ítems de requerimiento registrados en el sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchDetalleReqs}
            className="text-[11px] px-3 py-1.5 rounded-full border border-slate-300 hover:bg-slate-100 transition"
          >
            🔄 Refrescar
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-4 overflow-auto">
          {detalleError && (
            <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {detalleError}
            </div>
          )}

          {detalleLoading ? (
            <p className="text-xs text-slate-500">
              Cargando detalle de requerimientos…
            </p>
          ) : detalleRows.length === 0 ? (
            <p className="text-xs text-slate-500">
              No hay registros en Detalle de Requerimientos.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-auto bg-white">
              {(() => {
                const cols = Object.keys(detalleRows[0] || {});
                return (
                  <table className="min-w-full text-[11px] text-slate-700">
                    <thead className="bg-slate-50 uppercase tracking-wide border-b border-slate-200">
                      <tr>
                        {cols.map((c) => (
                          <th
                            key={c}
                            className="px-3 py-2 text-left font-semibold"
                          >
                            {c.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detalleRows.map((row, idx) => (
                        <tr
                          key={row.id ?? idx}
                          className={
                            idx % 2 === 0
                              ? "bg-white"
                              : "bg-slate-50/60 border-t border-slate-100"
                          }
                        >
                          {cols.map((c) => {
                            const value = row[c];
                            const rendered =
                              value === null || value === undefined
                                ? "—"
                                : typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value);
                            return (
                              <td key={c} className="px-3 py-2">
                                {rendered}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </>
  ) : (
    // ---- ADMINISTRADOR ----
    <AdminUsersPanel />
  )}
</section>


      </div>
    </main>
  );
}

/* ======================= MODAL NUEVA / EDITAR COTIZACIÓN ======================= */

/* ======================= MODAL NUEVA / EDITAR COTIZACIÓN ======================= */

type ModalProps = {
  mode: "new" | "edit";
  row: any | null;
  onClose: () => void;
  onSaved: () => void;
};

function NuevaCotizacionModal({ mode, row, onClose, onSaved }: ModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      {/* Contenedor centrado con margen lateral */}
      <div className="w-full max-w-6xl px-4">
        {/* Tarjeta principal, sin borde doble */}
        <div className="rounded-3xl bg-white shadow-2xl overflow-hidden">
          {/* Esta caja limita la altura del formulario */}
          <div className="h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)]">
            {/* Aquí sí permitimos scroll interno (vertical + horizontal) */}
            <div className="h-full w-full overflow-x-auto overflow-y-auto">
              <NuevaCotizacion
                mode={mode}
                row={row}
                onSaved={onSaved}
                onCancel={onClose}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}









