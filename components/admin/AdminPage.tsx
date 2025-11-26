"use client";

import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserTable } from "@/components/admin/UserTable";
import {
  getPermissionsForRole,
  applyOverrides,
  LOG_COLUMNS,
  type PermissionOverrides,
  type Role,
  type LogColumnKey,
  type SectionKey,
} from "@/lib/permissions";


const ADMIN_EMAIL = "edwin.qm@outlook.com";

type Profile = {
  id: string;
  email: string | null;
  nombre: string | null;
  rol: string | null;
  is_active: boolean;
  permissions: any | null;
};


export function AdminPage() {
  const [usuarios, setUsuarios] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);

const selectedUser = usuarios.find((u) => u.id === selectedUserId) ?? null;


  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

        const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name, full_name, role, is_active, permissions")
        .order("email", { ascending: true });


      if (error) throw error;

        let rows: Profile[] = (data ?? []).map((r: any) => ({
        id: r.id,
        email: r.email,
        nombre: r.display_name ?? r.full_name ?? r.email ?? null,
        rol: r.role ?? null,
        is_active: r.is_active ?? false,
        permissions: r.permissions ?? null,
        }));


      // asegurar que tu correo sea admin
      const adminIndex = rows.findIndex((u) => u.email === ADMIN_EMAIL);
      if (adminIndex !== -1 && rows[adminIndex].rol !== "admin") {
        const adminRow = rows[adminIndex];

        const { data: updated, error: updateErr } = await supabase
          .from("profiles")
          .update({ role: "admin", is_active: true })
          .eq("id", adminRow.id)
          .select("id, email, display_name, full_name, role, is_active")
          .single();

            if (!updateErr && updated) {
            rows = rows.map((u, idx) =>
                idx === adminIndex
                ? {
                    id: updated.id,
                    email: updated.email,
                    nombre:
                        updated.display_name ??
                        updated.full_name ??
                        updated.email ??
                        null,
                    rol: updated.role ?? "admin",
                    is_active: updated.is_active ?? true,
                    permissions: u.permissions ?? null,
                    }
                : u
            );
}

      }

      setUsuarios(rows);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message ?? "Error al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    cargarUsuarios();
  }, []);

  const cambiarRol = async (id: string, nuevoRol: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: nuevoRol || null })
        .eq("id", id);

      if (error) throw error;

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, rol: nuevoRol || null } : u
        )
      );
    } catch (err: any) {
      alert("Error al actualizar rol: " + err.message);
    }
  };

  const aprobarUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "user", is_active: true })
        .eq("id", id);

      if (error) throw error;

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, rol: "user", is_active: true } : u
        )
      );
    } catch (err: any) {
      alert("Error al aprobar usuario: " + err.message);
    }
  };

  const bloquearUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, is_active: false } : u
        )
      );
    } catch (err: any) {
      alert("Error al bloquear usuario: " + err.message);
    }
  };

  const reactivarUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw error;

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, is_active: true } : u
        )
      );
    } catch (err: any) {
      alert("Error al reactivar usuario: " + err.message);
    }
  };

  return (
    <section className="flex flex-col h-full bg-white/90 border border-slate-200 rounded-3xl shadow-xl">
      <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-slate-800">
            Administrador de Usuarios
          </h1>
          <p className="text-[11px] text-slate-500">
            Gestiona los usuarios y permisos del sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarUsuarios}
          className="text-[11px] px-3 py-1.5 rounded-full border border-slate-300 hover:bg-slate-100 transition"
        >
          🔄 Refrescar
        </button>
      </header>

      <div className="flex-1 p-4 overflow-auto">
        {loading && (
          <div className="text-center text-xs text-slate-500">
            Cargando usuarios...
          </div>
        )}

        {!loading && errorMsg && (
          <div className="text-red-600 text-xs bg-red-50 border border-red-200 p-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && (
        <UserTable
        usuarios={usuarios}
        onChangeRol={cambiarRol}
        onApprove={aprobarUsuario}
        onBlock={bloquearUsuario}
        onReactivate={reactivarUsuario}
        onSelectUser={setSelectedUserId}
        />

        )}
            {selectedUser && (
            <div className="mt-5 border-t border-slate-200 pt-4">
                <UserPermissionsEditor
                user={selectedUser}
                onSaved={(updatedPermissions) => {
                    // actualiza en memoria
                    setUsuarios((prev) =>
                    prev.map((u) =>
                        u.id === selectedUser.id
                        ? { ...u, permissions: updatedPermissions }
                        : u
                    )
                    );
                }}
                />
            </div>
            )}
      </div>
    </section>
  );
}
type UserWithPerms = Profile;

type UserPermissionsEditorProps = {
  user: UserWithPerms;
  onSaved: (newPerms: PermissionOverrides | null) => void;
};

function UserPermissionsEditor({ user, onSaved }: UserPermissionsEditorProps) {
  const [selectedSection, setSelectedSection] =
    React.useState<SectionKey>("log");
  const [saving, setSaving] = React.useState(false);

  const base = getPermissionsForRole((user.rol ?? null) as Role);
  const overrides = (user.permissions ?? null) as PermissionOverrides | null;
  const [localOverrides, setLocalOverrides] =
    React.useState<PermissionOverrides>(overrides ?? {});

  React.useEffect(() => {
    setLocalOverrides(overrides ?? {});
  }, [user.id]);

  const effective = applyOverrides(base, localOverrides);

  const toggleLogColumn = (col: LogColumnKey) => {
    setLocalOverrides((prev) => {
      const current = prev.logColumns?.[col];
      const baseHas = base.logColumns.includes(col);
      const newValue = !(current ?? baseHas); // invertimos

      const next: PermissionOverrides = {
        ...prev,
        logColumns: { ...(prev.logColumns ?? {}) },
      };

      // si el nuevo valor coincide con el base, quitamos override
      if (newValue === baseHas) {
        delete next.logColumns![col];
      } else {
        next.logColumns![col] = newValue;
      }

      // si no quedan claves en logColumns, limpiamos
      if (Object.keys(next.logColumns!).length === 0) {
        delete next.logColumns;
      }

      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const clean =
        Object.keys(localOverrides).length === 0
          ? null
          : localOverrides;

      const { error } = await supabase
        .from("profiles")
        .update({ permissions: clean })
        .eq("id", user.id);

      if (error) throw error;

      onSaved(clean);
    } catch (err: any) {
      alert("Error al guardar permisos: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const logColumns = LOG_COLUMNS;

  return (
    <div className="rounded-2xl bg-slate-50/80 border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-slate-700">
            Permisos del usuario
          </p>
          <p className="text-[11px] text-slate-500">
            {user.nombre ?? user.email ?? "—"} •{" "}
            <span className="italic">
              Rol base: {user.rol ?? "sin rol"}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-[11px] px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition"
        >
          {saving ? "Guardando..." : "Guardar permisos"}
        </button>
      </div>

      {/* Selector de pestaña (por ahora solo Log tiene columnas configuradas) */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-slate-600">Pestaña:</span>
        <select
          value={selectedSection}
          onChange={(e) =>
            setSelectedSection(e.target.value as SectionKey)
          }
          className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-[11px]"
        >
          <option value="log">Log de Cotizaciones</option>
          <option value="requerimientos" disabled>
            Requerimientos (próximamente)
          </option>
          <option value="detalle_reqs" disabled>
            Detalle Reqs. (próximamente)
          </option>
        </select>
      </div>

      {selectedSection === "log" && (
        <div className="mt-2">
          <p className="text-[11px] text-slate-600 mb-1">
            Columnas visibles en <strong>Log de Cotizaciones</strong>:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {logColumns.map((col) => {
              const checked = effective.logColumns.includes(col);
              const labelMap: Record<LogColumnKey, string> = {
                cotizacion: "Cotización",
                descripcion: "Descripción",
                cliente: "Cliente",
                unidad_minera: "Unidad minera",
                tipo_servicio: "Tipo servicio",
                status_cotizacion: "Status cotización",
                status_proyecto: "Status proyecto",
                oferta_usd: "Oferta (USD)",
                moneda: "Moneda",
                acciones: "Acciones (ver/editar)",
              };

              return (
                <label
                  key={col}
                  className="flex items-center gap-2 text-[11px] text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleLogColumn(col)}
                    className="w-3 h-3"
                  />
                  <span>{labelMap[col]}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {selectedSection !== "log" && (
        <p className="text-[11px] text-slate-500 italic">
          Aún no hay columnas configuradas para esta pestaña.
        </p>
      )}
    </div>
  );
}

