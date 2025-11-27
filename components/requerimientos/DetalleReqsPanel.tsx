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
    <section className="flex flex-col h-full rounded-3xl border border-slate-100 bg-gradient-to-b from-sky-50/70 to-slate-50/40 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      {/* HEADER con estilo similar a Log de Cotizaciones */}
      <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-slate-900">
            Detalle de Requerimientos
          </h1>
          <p className="text-[11px] text-slate-500">
            Listado de ítems asociados a los requerimientos registrados en el sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDetalle}
          className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-sky-50 hover:border-sky-200 active:scale-[0.98] transition"
        >
          <span>🔄</span>
          <span>Refrescar</span>
        </button>
      </header>

      {/* CONTENIDO */}
      <div className="flex-1 p-4 overflow-auto">
        {loading && (
          <div className="text-center text-xs text-slate-500">
            Cargando detalle de requerimientos…
          </div>
        )}

        {!loading && errorMsg && (
          <div className="text-red-600 text-xs bg-red-50 border border-red-200 px-4 py-3 rounded-2xl">
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && (
          <div className="mt-1 rounded-3xl border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full w-full text-[11px] text-slate-700">
                <thead className="bg-slate-50/80 backdrop-blur-sm uppercase tracking-[0.08em] text-[10px] font-semibold text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">
                      N° Req
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">
                      Código
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">
                      Unidad
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">
                      OC
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">
                      Fecha reg.
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 hover:bg-sky-50/40 transition-colors"
                    >
                      <td className="px-4 py-2 align-middle whitespace-nowrap">
                        {r.nro_requerimiento || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 align-middle whitespace-nowrap">
                        {r.codigo || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 align-middle max-w-xs">
                        <span className="text-[11px] text-slate-700 line-clamp-2">
                          {r.descripcion || (
                            <span className="text-slate-400">—</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle whitespace-nowrap">
                        {r.unidad || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 align-middle whitespace-nowrap">
                        {r.cantidad !== null && r.cantidad !== undefined
                          ? r.cantidad.toLocaleString("es-PE", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-2 align-middle whitespace-nowrap">
                        {r.oc || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-2 align-middle whitespace-nowrap">
                        {r.estado || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 align-middle whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-5 text-center text-[11px] text-slate-400"
                      >
                        No hay ítems de requerimientos registrados todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
