// src/hooks/useColumnWidths.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Hook para manejar anchos de columnas por usuario + tabla.
 *
 * Ejemplo de uso:
 *  const { widths, updateWidth } = useColumnWidths("log_cotizaciones");
 *  const w = widths["cotizacion"] ?? 150;
 *  updateWidth("cotizacion", 220);
 */
export function useColumnWidths(tableKey: string) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [storageKey, setStorageKey] = useState<string | null>(null);

  // 1) Obtener usuario actual y armar la llave de storage
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id ?? "anonymous";

        const key = `eka_${userId}_${tableKey}_column_widths`;
        if (!isMounted) return;

        setStorageKey(key);

        // Leer anchos previos del localStorage
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === "object") {
                setWidths(parsed);
              }
            } catch (e) {
              console.warn("No se pudo parsear widths de localStorage:", e);
            }
          }
        }
      } catch (e) {
        console.warn("Error obteniendo usuario en useColumnWidths:", e);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [tableKey]);

  // 2) Guardar en localStorage cuando cambien y ya exista storageKey
  useEffect(() => {
    if (!storageKey) return;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(widths));
      }
    } catch (e) {
      console.warn("No se pudieron guardar anchos de columnas:", e);
    }
  }, [storageKey, widths]);

  // 3) Función para actualizar un ancho
  const updateWidth = (columnKey: string, newWidth: number) => {
    setWidths((prev) => ({
      ...prev,
      [columnKey]: newWidth,
    }));
  };

  return { widths, updateWidth };
}
