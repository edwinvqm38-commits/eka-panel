// src/lib/permissions.ts

export type Role = "admin" | "user" | "lector" | "pending" | null;

export type SectionKey =
  | "dashboard"
  | "log"
  | "requerimientos"
  | "detalle_reqs"
  | "admin";

export type LogColumnKey =
  | "cotizacion"
  | "descripcion"
  | "cliente"
  | "unidad_minera"
  | "tipo_servicio"
  | "status_cotizacion"
  | "status_proyecto"
  | "oferta_usd"
  | "moneda"
  | "acciones";

export type RolePermissions = {
  sections: SectionKey[];      // pestañas visibles
  logColumns: LogColumnKey[];  // columnas visibles en Log
  canCreateQuote: boolean;
  canEditQuote: boolean;
};

const ALL_LOG_COLUMNS: LogColumnKey[] = [
  "cotizacion",
  "descripcion",
  "cliente",
  "unidad_minera",
  "tipo_servicio",
  "status_cotizacion",
  "status_proyecto",
  "oferta_usd",
  "moneda",
  "acciones",
];

// Lo exporto para usarlo en el editor de permisos
export const LOG_COLUMNS = ALL_LOG_COLUMNS;

const BASE_PERMISSIONS: Record<Exclude<Role, null>, RolePermissions> = {
  admin: {
    sections: ["dashboard", "log", "requerimientos", "detalle_reqs", "admin"],
    logColumns: ALL_LOG_COLUMNS,
    canCreateQuote: true,
    canEditQuote: true,
  },
  user: {
    sections: ["dashboard", "log", "requerimientos", "detalle_reqs"],
    logColumns: ALL_LOG_COLUMNS,
    canCreateQuote: true,
    canEditQuote: true,
  },
  lector: {
    sections: ["dashboard", "log"],
    // Ejemplo: lector no ve oferta ni moneda por defecto
    logColumns: ALL_LOG_COLUMNS.filter(
      (c) => c !== "oferta_usd" && c !== "moneda"
    ),
    canCreateQuote: false,
    canEditQuote: false,
  },
  pending: {
    sections: [],
    logColumns: [],
    canCreateQuote: false,
    canEditQuote: false,
  },
};

export function getPermissionsForRole(role: Role): RolePermissions {
  if (!role || !(role in BASE_PERMISSIONS)) {
    // por defecto nos comportamos como "user"
    return BASE_PERMISSIONS.user;
  }
  return BASE_PERMISSIONS[role as Exclude<Role, null>];
}

/* ---------- Overrides por usuario (columna JSONB "permissions") ---------- */

export type PermissionOverrides = {
  sections?: Partial<Record<SectionKey, boolean>>;      // true=forzar visible, false=forzar ocultar
  logColumns?: Partial<Record<LogColumnKey, boolean>>;  // idem para columnas
  canCreateQuote?: boolean | null;
  canEditQuote?: boolean | null;
};

export function applyOverrides(
  base: RolePermissions,
  overrides: PermissionOverrides | null | undefined
): RolePermissions {
  if (!overrides) return base;

  const merged: RolePermissions = {
    ...base,
    sections: [...base.sections],
    logColumns: [...base.logColumns],
  };

  // Secciones
  if (overrides.sections) {
    const set = new Set<SectionKey>(merged.sections);
    // meto todos los keys que existan en overrides
    (Object.keys(overrides.sections) as SectionKey[]).forEach((sec) => {
      const val = overrides.sections![sec];
      if (val === true) set.add(sec);
      if (val === false) set.delete(sec);
    });
    merged.sections = Array.from(set);
  }

  // Columnas de log
  if (overrides.logColumns) {
    const set = new Set<LogColumnKey>(merged.logColumns);
    (Object.keys(overrides.logColumns) as LogColumnKey[]).forEach((col) => {
      const val = overrides.logColumns![col];
      if (val === true) set.add(col);
      if (val === false) set.delete(col);
    });
    merged.logColumns = Array.from(set);
  }

  if (overrides.canCreateQuote !== undefined && overrides.canCreateQuote !== null) {
    merged.canCreateQuote = overrides.canCreateQuote;
  }

  if (overrides.canEditQuote !== undefined && overrides.canEditQuote !== null) {
    merged.canEditQuote = overrides.canEditQuote;
  }

  return merged;
}
