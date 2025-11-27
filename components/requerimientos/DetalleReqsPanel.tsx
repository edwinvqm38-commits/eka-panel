"use client";

import React from "react";
import { supabase } from "@/lib/supabaseClient";

type DetalleReqRow = {
  id: string;
  nro_requerimiento: string | null;
  codigo: string | null;
  descripcion: string | null;
  unidad: string | null;
  cantidad: number | null;
  oc: string | null;
  estado: string | null;
  created_at: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE");
}

export function DetalleReqsPanel() {
  const [rows, setRows] = React.useState<DetalleReqRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const fetchDetalle = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("Detalle Reqs") // 👈 nombre de la tabla en Supabase
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRows((data ?? []) as DetalleReqRow[]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Error al cargar Detalle de Requerimientos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDetalle();
  }, []);

  return (
    <section className="flex flex-col h-full bg-white/90 border border-slate-200 rounded-3xl shadow-xl">
      {/* HEADER igual estilo que Administrador */}
      <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-slate-800">
            Detalle de Requerimientos
          </h1>
          <p className="text-[11px] text-slate-500">
            Listado de ítems asociados a los requerimientos registrados.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDetalle}
          className="text-[11px] px-3 py-1.5 rounded-full border border-slate-300 hover:bg-slate-100 transition"
        >
          🔄 Refrescar
        </button>
      </header>

      <div className="flex-1 p-4 overflow-auto">
        {loading && (
          <div className="text-center text-xs text-slate-500">
            Cargando detalle de requerimientos…
          </div>
        )}

        {!loading && errorMsg && (
          <div className="text-red-600 text-xs bg-red-50 border border-red-200 p-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <table className="min-w-full text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">N° Req</th>
                  <th className="px-3 py-2 text-left font-semibold">Código</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Descripción
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Unidad</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Cantidad
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">OC</th>
                  <th className="px-3 py-2 text-left font-semibold">Estado</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Fecha reg.
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={
                      idx % 2 === 0
                        ? "bg-white"
                        : "bg-slate-50/60 border-t border-slate-100"
                    }
                  >
                    <td className="px-3 py-2">
                      {r.nro_requerimiento || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.codigo || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      <span className="text-[11px] text-slate-700 line-clamp-2">
                        {r.descripcion || (
                          <span className="text-slate-400">—</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {r.unidad || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {r.cantidad !== null && r.cantidad !== undefined
                        ? r.cantidad.toLocaleString("es-PE", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.oc || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {r.estado || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(r.created_at)}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-4 text-center text-[11px] text-slate-400"
                    >
                      No hay ítems de requerimientos registrados todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
