"use client";
import { Eye, Pencil } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { NuevaCotizacion } from "@/components/cotizaciones/NuevaCotizacion";
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
import { useColumnWidths } from "@/hooks/useColumnWidths";

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

// 🔹 Clave para guardar la vista actual
const VIEW_KEY = "eka_cotizaciones_view_v1";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
  permissions: any | null;
};

/* ======================= PÁGINA ======================= */

export default function LogCotizacionesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 🔹 AHORA arranca en null para evitar parpadeo
  const [view, setView] = useState<"log" | "admin" | "detalle_reqs" | null>(null);

  const [perfil, setPerfil] = useState<ProfileRow | null>(null);

  // ✅ Leer vista guardada en localStorage al montar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(VIEW_KEY);
    const initial: "log" | "admin" | "detalle_reqs" =
      saved === "log" || saved === "admin" || saved === "detalle_reqs"
        ? saved
        : "log";

    setView(initial);
  }, []);

  // ✅ Helper para cambiar vista + guardar en localStorage
  function changeView(v: "log" | "admin" | "detalle_reqs") {
    setView(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_KEY, v);
    }
  }

  // ✅ Anchos por DEFECTO de columnas
  const LOG_COLUMNS_DEFAULT_WIDTHS: Record<string, number> = {
    cotizacion: 150,
    descripcion: 260,
    cliente: 180,
    unidad_minera: 200,
    tipo_servicio: 180,
    status_cotizacion: 200,
    status_proyecto: 200,
    oferta_usd: 140,
    moneda: 110,
  };

  // ✅ Hook que guarda anchos por usuario + tabla
  const { widths, updateWidth } = useColumnWidths("log_cotizaciones");

  // 🧠 Ref para manejar el arrastre de la columna
  const resizeInfoRef = useRef<{
    columnKey:
      | "cotizacion"
      | "descripcion"
      | "cliente"
      | "unidad_minera"
      | "tipo_servicio"
      | "status_cotizacion"
      | "status_proyecto"
      | "oferta_usd"
      | "moneda"
      | null;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Helper para obtener el ancho actual (persistido o default)
  const getColumnWidth = (key: keyof typeof LOG_COLUMNS_DEFAULT_WIDTHS) => {
    return widths[key] ?? LOG_COLUMNS_DEFAULT_WIDTHS[key];
  };

  function handleMouseMove(ev: MouseEvent) {
    if (!resizeInfoRef.current) return;

    const { columnKey, startX, startWidth } = resizeInfoRef.current;
    if (!columnKey) return;

    const delta = ev.clientX - startX;
    const newWidth = Math.max(80, startWidth + delta); // mínimo 80px

    // ✅ Actualiza el ancho en el hook (y se guarda en localStorage por usuario)
    updateWidth(columnKey, newWidth);
  }

  function handleMouseUp() {
    resizeInfoRef.current = null;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }

  function startResize(
    key:
      | "cotizacion"
      | "descripcion"
      | "cliente"
      | "unidad_minera"
      | "tipo_servicio"
      | "status_cotizacion"
      | "status_proyecto"
      | "oferta_usd"
      | "moneda",
    e: React.MouseEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    const th = e.currentTarget.parentElement as HTMLTableCellElement | null;
    if (!th) return;

    const rect = th.getBoundingClientRect();

    resizeInfoRef.current = {
      columnKey: key,
      startX: e.clientX,
      startWidth: rect.width,
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  // Limpieza por si se desmonta el componente
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // -------- Detalle de Requerimientos ----------
  const [detalleRows, setDetalleRows] = useState<any[]>([]);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);

  // --- filtros y tamaños de página para LOG y DETALLE ---
  const [logPageSize, setLogPageSize] = useState(30);
  const [logSearch, setLogSearch] = useState("");
  const [logColumnFilters, setLogColumnFilters] =
    useState<Record<string, string>>({});

  const [detallePageSize, setDetallePageSize] = useState(50);
  const [detalleSearch, setDetalleSearch] = useState("");
  const [detalleColumnFilters, setDetalleColumnFilters] =
    useState<Record<string, string>>({});

  const [logSubView, setLogSubView] = useState<
    "tabla" | "seguimiento" | "kpis" | "resumen"
  >("tabla");

  // Filtrado para Log de Cotizaciones
  const filteredLogRows = React.useMemo(() => {
    let result = [...rows];

    const q = logSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        Object.values(r).some((v) =>
          String(v ?? "").toLowerCase().includes(q)
        )
      );
    }

    Object.entries(logColumnFilters).forEach(([key, value]) => {
      const t = value.trim().toLowerCase();
      if (!t) return;

      result = result.filter((r) => {
        let raw: any = "";

        switch (key) {
          case "status_cotizacion":
            raw = r.estado_cotizacion ?? r.status_cotizacion ?? "";
            break;
          case "oferta_usd":
            raw = r.oferta_usd ?? r.moneda_normalizada_usd ?? "";
            break;
          default:
            raw = (r as any)[key] ?? "";
            break;
        }

        return String(raw).toLowerCase().includes(t);
      });
    });

    return result;
  }, [rows, logSearch, logColumnFilters]);

  const visibleLogRows = React.useMemo(
    () => filteredLogRows.slice(0, logPageSize),
    [filteredLogRows, logPageSize]
  );

  // Filtrado para Detalle Reqs
  const filteredDetalleRows = React.useMemo(() => {
    let result = [...detalleRows];

    const q = detalleSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        Object.values(r).some((v) =>
          String(v ?? "").toLowerCase().includes(q)
        )
      );
    }

    Object.entries(detalleColumnFilters).forEach(([key, value]) => {
      const t = value.trim().toLowerCase();
      if (!t) return;

      result = result.filter((r) =>
        String((r as any)[key] ?? "")
          .toLowerCase()
          .includes(t)
      );
    });

    return result;
  }, [detalleRows, detalleSearch, detalleColumnFilters]);

  const visibleDetalleRows = React.useMemo(
    () => filteredDetalleRows.slice(0, detallePageSize),
    [filteredDetalleRows, detallePageSize]
  );

  const fetchDetalleReqs = async () => {
    try {
      setDetalleLoading(true);
      setDetalleError(null);

      const { data, error } = await supabase
        .from("Detalle de Requerimientos")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      setDetalleRows(data || []);
    } catch (e: any) {
      console.error("Error detalle_reqs:", e);
      setDetalleError(e.message ?? "Error al cargar Detalle de Requerimientos.");
    } finally {
      setDetalleLoading(false);
    }
  };

  // Modal Nueva / Editar
  const [isNuevaOpen, setIsNuevaOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);

  const basePerms = getPermissionsForRole((perfil?.role ?? null) as Role);

  const perms = applyOverrides(
    basePerms,
    (perfil?.permissions ?? null) as PermissionOverrides | null
  );

  // 🔑 Mientras el perfil NO está cargado, mostramos todas las secciones
  const canSeeSection = (section: SectionKey) => {
    if (!perfil) return true;
    return perms.sections.includes(section);
  };

  const canSeeColumn = (col: LogColumnKey) => perms.logColumns.includes(col);

  const canCreateQuote = perms.canCreateQuote;
  const canEditQuote = perms.canEditQuote;

  // Crea el profile si no existe aún en la tabla "profiles"
  const ensureProfileForUser = async (user: User) => {
    try {
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

      const fullName =
        (user.user_metadata as any)?.full_name ??
        (user.user_metadata as any)?.name ??
        null;

      const { error: insertErr } = await supabase.from("profiles").insert({
        user_id: user.id,
        email: user.email,
        full_name: fullName,
        display_name: fullName ?? user.email,
        role: "pending",
        is_active: false,
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

      await ensureProfileForUser(user);

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

      await fetchData();
    };

    checkSessionAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view === "detalle_reqs") {
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

  const handleSaved = async () => {
    closeModal();
    await fetchData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
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
    <main className="h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-slate-50 to-emerald-50">
      <div className="w-full h-full flex gap-6 px-6 py-6 min-w-0">
        {/* ---------------- SIDEBAR ---------------- */}
        <aside
          className={`hidden md:flex shrink-0 flex-col
            bg-gradient-to-b from-sky-50 via-slate-50 to-sky-50
            border border-slate-100 shadow-md rounded-3xl
            px-3 py-4
            transition-all duration-300
            ${sidebarCollapsed ? "w-20 items-center" : "w-64"}
          `}
        >
          {/* HEADER LOGO */}
          <div
            className={`flex items-center gap-3 px-2 pb-4 border-b border-slate-200
              ${sidebarCollapsed ? "justify-center" : ""}
            `}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500 text-sm font-bold text-white shadow-sm">
              EKA
            </div>

            {!sidebarCollapsed && (
              <div>
                <p className="text-xs font-semibold leading-tight text-slate-700">
                  EKA MININNG SAC
                </p>
                <p className="text-[11px] text-slate-500">
                  Log de Cotizaciones &amp; Reqs.
                </p>
              </div>
            )}
          </div>

          {/* NAV PRINCIPAL */}
          <nav className="flex-1 mt-3 space-y-1 text-xs w-full">
            {canSeeSection("dashboard") && (
              <button
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl
                  hover:bg-slate-100 text-slate-600 transition
                  ${sidebarCollapsed ? "justify-center" : ""}
                `}
                type="button"
              >
                <span className="text-lg">🏠</span>
                {!sidebarCollapsed && <span>Dashboard</span>}
              </button>
            )}

            {canSeeSection("log") && (
              <button
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl
                  ${
                    view === "log"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "hover:bg-sky-100 text-slate-600"
                  }
                  transition
                  ${sidebarCollapsed ? "justify-center" : ""}
                `}
                type="button"
                onClick={() => changeView("log")}
              >
                <span className="text-lg">📄</span>
                {!sidebarCollapsed && <span>Log de Cotizaciones</span>}
              </button>
            )}

            {canSeeSection("requerimientos") && (
              <button
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl
                  hover:bg-slate-100 text-slate-600 transition
                  ${sidebarCollapsed ? "justify-center" : ""}
                `}
                type="button"
              >
                <span className="text-lg">📦</span>
                {!sidebarCollapsed && <span>Requerimientos</span>}
              </button>
            )}

            {canSeeSection("detalle_reqs") && (
              <button
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl
                  ${
                    view === "detalle_reqs"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "hover:bg-sky-100 text-slate-600"
                  }
                  transition
                  ${sidebarCollapsed ? "justify-center" : ""}
                `}
                type="button"
                onClick={() => changeView("detalle_reqs")}
              >
                <span className="text-lg">📝</span>
                {!sidebarCollapsed && <span>Detalle Reqs.</span>}
              </button>
            )}
          </nav>

          {/* ZONA INFERIOR */}
          <div className="mt-auto pt-3 border-t border-slate-200 space-y-3 w-full">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className={`w-full flex items-center ${
                sidebarCollapsed ? "justify-center" : "justify-center"
              }
                gap-2 rounded-xl bg-sky-50 text-[11px] text-slate-600 py-2 hover:bg-sky-100 transition
              `}
            >
              <span className="text-sm">
                {sidebarCollapsed ? "⮞" : "⮜"}
              </span>
              {!sidebarCollapsed && <span>Contraer menú</span>}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className={`w-full flex items-center gap-2
                rounded-2xl bg-slate-900 text-[11px] text-slate-100 py-2 px-3
                hover:bg-black transition shadow-sm
                ${
                  sidebarCollapsed
                    ? "justify-center"
                    : "justify-center md:justify-center"
                }
              `}
            >
              <span className="text-sm">⏻</span>
              {!sidebarCollapsed && <span>Cerrar sesión</span>}
            </button>

            {canSeeSection("admin") && (
              <button
                type="button"
                onClick={() => changeView("admin")}
                className={`w-full flex items-center gap-2
                  rounded-2xl text-[11px] py-2 px-3
                  hover:bg-slate-900 transition shadow-sm
                  ${
                    view === "admin"
                      ? "bg-gradient-to-r from-sky-400 to-emerald-400 text-white"
                      : "bg-gradient-to-r from-sky-50 to-emerald-50 text-slate-700"
                  }
                `}
              >
                <span className="text-lg">⚙️</span>
                {!sidebarCollapsed && (
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-[12px]">
                      Administrador
                    </span>
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
        <section className="flex-1 min-h-0 min-w-0">
          {view === "log" ? (
            <>
              {/* CARD PRINCIPAL */}
              <div className="flex flex-col h-full w-full min-w-0 bg-white/90 border border-slate-200 rounded-3xl shadow-xl">
                {/* HEADER */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  {/* Título + pestañas */}
                  <div className="flex items-center gap-4">
                    <div>
                      <h1 className="text-sm font-semibold text-slate-800">
                        Log de Cotizaciones
                      </h1>
                      <p className="text-xs text-slate-500">
                        Registro centralizado de todas las cotizaciones del sistema.
                      </p>
                    </div>

                    {/* Pestañas: Tabla / Seguimiento / KPIs / Resumen */}
                    <div className="hidden md:flex items-center gap-2">
                      {[
                        { id: "tabla", label: "Tabla" },
                        { id: "seguimiento", label: "Seguimiento" },
                        { id: "kpis", label: "KPIs" },
                        { id: "resumen", label: "Resumen" },
                      ].map((tab) => {
                        const isActive = logSubView === tab.id;

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setLogSubView(tab.id as any)}
                            className={`h-9 inline-flex items-center px-4
                              rounded-full text-[11px] border transition
                              ${
                                isActive
                                  ? "bg-sky-600 border-sky-600 text-white shadow-sm"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-sky-50"
                              }
                            `}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Controles derecha */}
                  <div className="flex items-center gap-3">
                    {/* selector de filas */}
                    <div className="hidden md:flex items-center text-[11px] text-slate-500">
                      <span className="mr-1">Mostrar</span>
                      <select
                        value={logPageSize}
                        onChange={(e) => setLogPageSize(Number(e.target.value))}
                        className="h-9 rounded-full border border-slate-200 bg-white
                          px-3 pr-7 text-[11px]
                          focus:outline-none focus:ring-2 focus:ring-blue-500/60
                        "
                      >
                        <option value={10}>10 filas</option>
                        <option value={20}>20 filas</option>
                        <option value={30}>30 filas</option>
                        <option value={40}>40 filas</option>
                        <option value={100}>100 filas</option>
                      </select>
                    </div>

                    {/* buscador */}
                    <div className="relative">
                      <input
                        type="text"
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        placeholder="Buscar en la tabla…"
                        className="h-9 w-40 md:w-56
                          rounded-full border border-slate-200 bg-white
                          pl-7 pr-3 text-[11px]
                          focus:outline-none focus:ring-2 focus:ring-blue-500/60
                        "
                      />
                      <span className="absolute left-2 top-[7px] text-xs text-slate-400">
                        🔍
                      </span>
                    </div>

                    {/* botón Nueva Cotización */}
                    <button
                      type="button"
                      onClick={openNueva}
                      className="h-9 inline-flex items-center px-4 rounded-full
                        text-[11px] font-semibold bg-sky-600 text-white
                        border border-sky-700 hover:bg-sky-700 transition
                      "
                    >
                      Nueva Cotización
                    </button>
                  </div>
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 min-h-0 p-4">
                  {/* ==================== TABLA ==================== */}
                  {logSubView === "tabla" && (
                    <>
                      {errorMsg && (
                        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                          {errorMsg}
                        </div>
                      )}

                      {!loading && !errorMsg && rows.length === 0 && (
                        <p className="text-sm text-slate-500">
                          No hay cotizaciones registradas todavía.
                        </p>
                      )}

                      {rows.length > 0 && (
                        <div className="h-full max-w-full border border-slate-200 rounded-2xl bg-white overflow-auto">
                          <table className="min-w-max text-xs text-slate-700">
                            <thead className="sticky top-0 z-10 bg-sky-50/70 text-xs uppercase tracking-wide border-b border-slate-100 text-slate-600">
                              <tr>
                                <th
                                  className="px-3 py-2 text-left font-semibold relative group"
                                  style={{ width: getColumnWidth("cotizacion") }}
                                >
                                  <span>Cotización</span>
                                  <div
                                    onMouseDown={(e) => startResize("cotizacion", e)}
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-slate-300/60 opacity-0 group-hover:opacity-100"
                                  />
                                </th>

                                <th
                                  className="px-3 py-2 text-left font-semibold relative group"
                                  style={{ width: getColumnWidth("descripcion") }}
                                >
                                  <span>Descripción</span>
                                  <div
                                    onMouseDown={(e) => startResize("descripcion", e)}
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-slate-300/60 opacity-0 group-hover:opacity-100"
                                  />
                                </th>

                                <th
                                  className="px-3 py-2 text-left font-semibold relative group"
                                  style={{ width: getColumnWidth("cliente") }}
                                >
                                  <span>Cliente</span>
                                  <div
                                    onMouseDown={(e) => startResize("cliente", e)}
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-slate-300/60 opacity-0 group-hover:opacity-100"
                                  />
                                </th>

                                <th
                                  className="px-3 py-2 text-left font-semibold relative group"
                                  style={{ width: getColumnWidth("unidad_minera") }}
                                >
                                  <span>Unidad minera</span>
                                  <div
                                    onMouseDown={(e) =>
                                      startResize("unidad_minera", e)
                                    }
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-slate-300/60 opacity-0 group-hover:opacity-100"
                                  />
                                </th>

                                <th
                                  className="px-3 py-2 text-left font-semibold relative group"
                                  style={{ width: getColumnWidth("tipo_servicio") }}
                                >
                                  <span>Tipo servicio</span>
                                  <div
                                    onMouseDown={(e) =>
                                      startResize("tipo_servicio", e)
                                    }
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-slate-300/60 opacity-0 group-hover:opacity-100"
                                  />
                                </th>

                                <th
                                  className="px-3 py-2 text-left font-semibold relative group"
                                  style={{
                                    width: getColumnWidth("status_cotizacion"),
                                  }}
                                >
                                  <span>Status cotización</span>
                                  <div
                                    onMouseDown={(e) =>
                                      startResize("status_cotizacion", e)
                                    }
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-slate-300/60 opacity-0 group-hover:opacity-100"
                                  />
                                </th>

                                <th
                                  className="px-3 py-2 text-left font-semibold relative group"
                                  style={{
                                    width: getColumnWidth("status_proyecto"),
                                  }}
                                >
                                  <span>Status proyecto</span>
                                  <div
                                    onMouseDown={(e) =>
                                      startResize("status_proyecto", e)
                                    }
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-slate-300/60 opacity-0 group-hover:opacity-100"
                                  />
                                </th>

                                <th
                                  className="px-3 py-2 text-left font-semibold relative group"
                                  style={{ width: getColumnWidth("oferta_usd") }}
                                >
                                  <span>Oferta (USD)</span>
                                  <div
                                    onMouseDown={(e) =>
                                      startResize("oferta_usd", e)
                                    }
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-slate-300/60 opacity-0 group-hover:opacity-100"
                                  />
                                </th>

                                <th
                                  className="px-3 py-2 text-left font-semibold relative group"
                                  style={{ width: getColumnWidth("moneda") }}
                                >
                                  <span>Moneda</span>
                                  <div
                                    onMouseDown={(e) => startResize("moneda", e)}
                                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-slate-300/60 opacity-0 group-hover:opacity-100"
                                  />
                                </th>
                              </tr>

                              {/* fila filtros */}
                              <tr className="bg-sky-50/50 text-[10px] normal-case">
                                <th className="px-3 py-1">
                                  <input
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-300 outline-none"
                                    placeholder="Filtrar"
                                    value={logColumnFilters.cotizacion ?? ""}
                                    onChange={(e) =>
                                      setLogColumnFilters((prev) => ({
                                        ...prev,
                                        cotizacion: e.target.value,
                                      }))
                                    }
                                  />
                                </th>
                                <th className="px-3 py-1">
                                  <input
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-300 outline-none"
                                    placeholder="Filtrar"
                                    value={logColumnFilters.descripcion ?? ""}
                                    onChange={(e) =>
                                      setLogColumnFilters((prev) => ({
                                        ...prev,
                                        descripcion: e.target.value,
                                      }))
                                    }
                                  />
                                </th>
                                <th className="px-3 py-1">
                                  <input
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-300 outline-none"
                                    placeholder="Filtrar"
                                    value={logColumnFilters.cliente ?? ""}
                                    onChange={(e) =>
                                      setLogColumnFilters((prev) => ({
                                        ...prev,
                                        cliente: e.target.value,
                                      }))
                                    }
                                  />
                                </th>
                                <th className="px-3 py-1">
                                  <input
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-300 outline-none"
                                    placeholder="Filtrar"
                                    value={logColumnFilters.unidad_minera ?? ""}
                                    onChange={(e) =>
                                      setLogColumnFilters((prev) => ({
                                        ...prev,
                                        unidad_minera: e.target.value,
                                      }))
                                    }
                                  />
                                </th>
                                <th className="px-3 py-1">
                                  <input
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-300 outline-none"
                                    placeholder="Filtrar"
                                    value={logColumnFilters.tipo_servicio ?? ""}
                                    onChange={(e) =>
                                      setLogColumnFilters((prev) => ({
                                        ...prev,
                                        tipo_servicio: e.target.value,
                                      }))
                                    }
                                  />
                                </th>
                                <th className="px-3 py-1">
                                  <input
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-300 outline-none"
                                    placeholder="Filtrar"
                                    value={logColumnFilters.status_cotizacion ?? ""}
                                    onChange={(e) =>
                                      setLogColumnFilters((prev) => ({
                                        ...prev,
                                        status_cotizacion: e.target.value,
                                      }))
                                    }
                                  />
                                </th>
                                <th className="px-3 py-1">
                                  <input
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-300 outline-none"
                                    placeholder="Filtrar"
                                    value={logColumnFilters.status_proyecto ?? ""}
                                    onChange={(e) =>
                                      setLogColumnFilters((prev) => ({
                                        ...prev,
                                        status_proyecto: e.target.value,
                                      }))
                                    }
                                  />
                                </th>
                                <th className="px-3 py-1">
                                  <input
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-300 outline-none"
                                    placeholder="Filtrar"
                                    value={logColumnFilters.oferta_usd ?? ""}
                                    onChange={(e) =>
                                      setLogColumnFilters((prev) => ({
                                        ...prev,
                                        oferta_usd: e.target.value,
                                      }))
                                    }
                                  />
                                </th>
                                <th className="px-3 py-1">
                                  <input
                                    className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-300 outline-none"
                                    placeholder="Filtrar"
                                    value={logColumnFilters.moneda ?? ""}
                                    onChange={(e) =>
                                      setLogColumnFilters((prev) => ({
                                        ...prev,
                                        moneda: e.target.value,
                                      }))
                                    }
                                  />
                                </th>
                                <th />
                              </tr>
                            </thead>

                            <tbody>
                              {visibleLogRows.map((r, idx) => {
                                const statusCot =
                                  r.estado_cotizacion ||
                                  r.status_cotizacion ||
                                  "—";
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
                                      <td className="px-3 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-mono text-[11px] truncate">
                                            {r.cotizacion}
                                          </span>

                                          <div className="flex items-center gap-1 text-slate-400">
                                            <button
                                              type="button"
                                              onClick={() => toggleExpand(r.id)}
                                              className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 hover:text-slate-700"
                                              title={
                                                isExpanded
                                                  ? "Ocultar detalle"
                                                  : "Ver detalle"
                                              }
                                            >
                                              <Eye className="h-4 w-4" />
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => openEditar(r)}
                                              className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-blue-50 hover:text-blue-600"
                                              title="Editar cotización"
                                            >
                                              <Pencil className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>
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
                                    </tr>

                                    {isExpanded && (
                                      <tr>
                                        <td
                                          colSpan={9}
                                          className="bg-slate-50 border-t border-slate-200 px-4 py-4"
                                        >
                                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-700">
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                              <div>
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                                  Detalle de la cotización
                                                </p>
                                                <p className="font-mono text-[11px] text-slate-800">
                                                  {r.cotizacion ?? "—"}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-3">
                                              <div>
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase">
                                                  Cliente
                                                </p>
                                                <p>{r.cliente || "—"}</p>
                                              </div>

                                              <div>
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase">
                                                  Unidad minera
                                                </p>
                                                <p>{r.unidad_minera || "—"}</p>
                                              </div>

                                              <div>
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase">
                                                  Tipo de servicio
                                                </p>
                                                <p>{r.tipo_servicio || "—"}</p>
                                              </div>

                                              <div>
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase">
                                                  Status cotización
                                                </p>
                                                <p>
                                                  {r.estado_cotizacion ||
                                                    r.status_cotizacion ||
                                                    "—"}
                                                </p>
                                              </div>

                                              <div>
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase">
                                                  Status proyecto
                                                </p>
                                                <p>{r.status_proyecto || "—"}</p>
                                              </div>

                                              <div>
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase">
                                                  Oferta (USD)
                                                </p>
                                                <p>
                                                  {ofertaUsd !== null
                                                    ? ofertaUsd.toLocaleString(
                                                        "es-PE",
                                                        {
                                                          minimumFractionDigits: 2,
                                                          maximumFractionDigits: 2,
                                                        }
                                                      )
                                                    : "—"}
                                                </p>
                                              </div>

                                              <div>
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase">
                                                  Moneda
                                                </p>
                                                <p>{r.moneda || "—"}</p>
                                              </div>

                                              <div>
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase">
                                                  Fecha registro
                                                </p>
                                                <p>{formatDate(r.fecha_registro)}</p>
                                              </div>

                                              <div className="md:col-span-3">
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase">
                                                  Descripción
                                                </p>
                                                <p className="whitespace-pre-wrap">
                                                  {r.descripcion || "—"}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
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

                      {loading && (
                        <p className="text-sm text-slate-500">
                          Cargando registros…
                        </p>
                      )}
                    </>
                  )}

                  {/* ==================== SEGUIMIENTO ==================== */}
                  {logSubView === "seguimiento" && (
                    <div className="h-full max-w-full border border-slate-200 rounded-2xl bg-white overflow-auto p-4 text-[12px] text-slate-700">
                      <h2 className="text-sm font-semibold text-slate-800 mb-2">
                        Seguimiento de cotizaciones
                      </h2>
                      <p>
                        Aquí podrás construir la vista de seguimiento (etapas,
                        responsables, fechas clave, etc.) manteniendo el mismo estilo
                        de tarjeta.
                      </p>
                    </div>
                  )}

                  {/* ==================== KPIs ==================== */}
                  {logSubView === "kpis" && (
                    <div className="h-full max-w-full border border-slate-200 rounded-2xl bg-white overflow-auto p-4 text-[12px] text-slate-700">
                      <h2 className="text-sm font-semibold text-slate-800 mb-2">
                        KPIs de cotizaciones
                      </h2>
                      <p>
                        Aquí irán tus indicadores (ganadas, perdidas, montos,
                        porcentajes, etc.) usando el mismo contenedor estandarizado.
                      </p>
                    </div>
                  )}

                  {/* ==================== RESUMEN ==================== */}
                  {logSubView === "resumen" && (
                    <div className="h-full max-w-full border border-slate-200 rounded-2xl bg-white overflow-auto p-4 text-[12px] text-slate-700">
                      <h2 className="text-sm font-semibold text-slate-800 mb-2">
                        Resumen general
                      </h2>
                      <p>
                        Vista pensada como resumen ejecutivo del log de cotizaciones:
                        últimos movimientos, alertas importantes y cualquier cuadro
                        resumen que quieras.
                      </p>
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
                    ) : view === "detalle_reqs" ? (
            <>
              {/* ---- DETALLE DE REQUERIMIENTOS ---- */}
              <div className="flex flex-col h-full w-full min-w-0 bg-white/90 border border-slate-200 rounded-3xl shadow-xl">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-sm font-semibold text-slate-800">
                      Detalle de Requerimientos
                    </h1>
                    <p className="text-[11px] text-slate-500">
                      Listado de ítems de requerimiento registrados en el sistema.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* selector de filas */}
                    <div className="hidden md:flex items-center text-[11px] text-slate-500">
                      <span className="mr-1">Mostrar</span>
                      <select
                        value={detallePageSize}
                        onChange={(e) =>
                          setDetallePageSize(Number(e.target.value))
                        }
                        className="h-9 rounded-full border border-slate-200 bg-white
                          px-3 pr-7 text-[11px]
                          focus:outline-none focus:ring-2 focus:ring-blue-500/60
                        "
                      >
                        <option value={10}>10 filas</option>
                        <option value={20}>20 filas</option>
                        <option value={30}>30 filas</option>
                        <option value={40}>40 filas</option>
                        <option value={100}>100 filas</option>
                      </select>
                    </div>

                    {/* buscador */}
                    <div className="relative">
                      <input
                        type="text"
                        value={detalleSearch}
                        onChange={(e) => setDetalleSearch(e.target.value)}
                        placeholder="Buscar en la tabla…"
                        className="h-9 w-40 md:w-56
                          rounded-full border border-slate-200 bg-white
                          pl-7 pr-3 text-[11px]
                          focus:outline-none focus:ring-2 focus:ring-blue-500/60
                        "
                      />
                      <span className="absolute left-2 top-[7px] text-xs text-slate-400">
                        🔍
                      </span>
                    </div>

                    {/* Refrescar */}
                    <button
                      type="button"
                      onClick={fetchDetalleReqs}
                      className="h-9 inline-flex items-center
                        px-4 rounded-full text-[11px]
                        border border-slate-300 bg-white hover:bg-slate-100 transition
                      "
                    >
                      🔄 Refrescar
                    </button>
                  </div>
                </div>

                {/* Contenido */}
                <div className="flex-1 min-h-0 p-4">
                  {detalleError && (
                    <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      {detalleError}
                    </div>
                  )}

                  {detalleLoading ? (
                    <p className="text-xs text-slate-500">
                      Cargando detalle de requerimientos…
                    </p>
                  ) : (
                    <div className="h-full max-w-full border border-slate-200 rounded-2xl bg-white overflow-auto">
                      {(() => {
                        const cols =
                          detalleRows.length > 0
                            ? Object.keys(detalleRows[0])
                            : [];

                        if (cols.length === 0) {
                          return (
                            <div className="flex h-full items-center justify-center text-xs text-slate-500">
                              No hay registros que mostrar.
                            </div>
                          );
                        }

                        return (
                          <table className="min-w-max text-[11px] text-slate-700">
                            {/* ENCABEZADOS */}
                            <thead className="sticky top-0 z-10 bg-sky-50/70 text-xs uppercase tracking-wide border-b border-slate-100 text-slate-600">
                              <tr>
                                {cols.map((c) => (
                                  <th
                                    key={c}
                                    className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                                  >
                                    {c.toUpperCase()}
                                  </th>
                                ))}
                              </tr>

                              {/* FILA DE FILTROS */}
                              <tr className="bg-sky-50/50 text-[10px] normal-case">
                                {cols.map((c) => (
                                  <th key={c} className="px-3 py-1">
                                    <input
                                      className="w-full px-2 py-1 rounded-lg border border-slate-200
                                        focus:border-sky-400 focus:ring-1 focus:ring-sky-300 outline-none
                                      "
                                      placeholder="Filtrar"
                                      value={detalleColumnFilters[c] ?? ""}
                                      onChange={(e) =>
                                        setDetalleColumnFilters((prev) => ({
                                          ...prev,
                                          [c]: e.target.value,
                                        }))
                                      }
                                    />
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            {/* CUERPO */}
                            <tbody>
                              {visibleDetalleRows.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={cols.length}
                                    className="px-4 py-6 text-center text-xs text-slate-500"
                                  >
                                    No hay registros que coincidan con los filtros.
                                  </td>
                                </tr>
                              ) : (
                                visibleDetalleRows.map((row, idx) => (
                                  <tr
                                    key={row.id ?? idx}
                                    className={`${
                                      idx % 2 === 0
                                        ? "bg-white"
                                        : "bg-slate-50/60 border-t border-slate-100"
                                    } hover:bg-sky-50/40 transition-colors`}
                                  >
                                    {cols.map((c) => {
                                      const value = (row as any)[c];
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
                                ))
                              )}
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

            <AdminUsersPanel />
          )}
        </section>
      </div>
    </main>
  );
}

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
      <div className="w-full max-w-6xl px-4">
        <div className="rounded-3xl bg-white shadow-2xl overflow-hidden">
          <div className="h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)]">
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



