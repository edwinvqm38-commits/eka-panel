"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SelectWithActions } from "@/components/ui/SelectWithActions";
import { inputBase, labelBase } from "@/components/ui/formStyles";

/* ------------------------- Tipos auxiliares ------------------------- */

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  url?: string;
  error?: string;
};

type Solicitante = {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
};

type OpcionSimple = {
  id: string;
  nombre: string;
};

type OptionTable =
  | "clientes"
  | "unidades_minera"
  | "tipos_servicio"
  | "solicitantes"
  | "responsables"
  | "status_cotizacion_catalogo";

/* ------------------------- Spinner reutilizable ------------------------- */

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
  );
}

/* ------------------------- Modal gestor de listas ------------------------- */

type OptionManagerState =
  | {
      open: true;
      table: OptionTable;
      title: string;
    }
  | {
      open: false;
      table: null;
      title: "";
    };

const initialOptionManagerState: OptionManagerState = {
  open: false,
  table: null,
  title: "",
};

type OptionManagerModalProps = {
  state: OptionManagerState;
  onClose: () => void;
  onChanged: () => void;
};

function OptionManagerModal({
  state,
  onClose,
  onChanged,
}: OptionManagerModalProps) {
  const [rows, setRows] = useState<OpcionSimple[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OpcionSimple | null>(null);

  const [isClosing, setIsClosing] = useState(false);

  const handleCloseWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const loadRows = async () => {
    if (!state.open || !state.table) return;
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from(state.table)
      .select("id, nombre")
      .order("nombre");

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
    } else if (data) {
      setRows(data as OpcionSimple[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (state.open && state.table) {
      setNewName("");
      setEditingId(null);
      setEditingName("");
      setDeleteTarget(null);
      setErrorMsg(null);
      loadRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.table]);

  if (!state.open || !state.table) return null;

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setErrorMsg("El nombre es obligatorio.");
      return;
    }
    setErrorMsg(null);
    const { error } = await supabase
      .from(state.table)
      .insert({ nombre: trimmed });
    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      return;
    }
    setNewName("");
    await loadRows();
    onChanged();
  };

  const startEdit = (row: OpcionSimple) => {
    setEditingId(row.id);
    setEditingName(row.nombre);
    setErrorMsg(null);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setErrorMsg("El nombre es obligatorio.");
      return;
    }
    const { error } = await supabase
      .from(state.table!)
      .update({ nombre: trimmed })
      .eq("id", editingId);
    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      return;
    }
    setEditingId(null);
    setEditingName("");
    await loadRows();
    onChanged();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from(state.table!)
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      return;
    }
    setDeleteTarget(null);
    await loadRows();
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 backdrop-blur-md transition-opacity duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 p-5 space-y-4 transform transition-all duration-200 ${
          isClosing
            ? "opacity-0 translate-y-2 scale-95"
            : "opacity-100 translate-y-0 scale-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Gestionar {state.title}
          </h2>
          <button
            onClick={handleCloseWithAnimation}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            Cerrar ✕
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Aquí puedes agregar, renombrar o eliminar valores de esta lista
          desplegable. Los cambios aplican a futuros registros.
        </p>

        {/* Alta rápida */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <label className={labelBase}>Nuevo registro</label>
            <input
              className={inputBase}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`Nombre para ${state.title.toLowerCase()}`}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold shadow hover:bg-sky-700 active:scale-95 transition"
          >
            Guardar
          </button>
        </div>

        {/* Tabla */}
        <div className="border rounded-xl max-h-72 overflow-auto">
          {loading ? (
            <div className="p-4 text-xs text-slate-500">Cargando…</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">
              No hay registros aún.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">
                    Nombre
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-1.5">
                      {editingId === r.id ? (
                        <input
                          className={`${inputBase} h-7 text-xs bg-white`}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                        />
                      ) : (
                        r.nombre
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right space-x-2">
                      {editingId === r.id ? (
                        <>
                    <button
                      onClick={handleEditSave}
                      className="text-[11px] px-2 py-1 rounded border border-sky-500 text-sky-600 hover:bg-sky-50"
                    >
                      Guardar
                    </button>

                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                            className="text-[11px] px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(r)}
                            className="text-[11px] px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                          >
                            Renombrar
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="text-[11px] px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {deleteTarget && (
          <div className="flex items-center justify-between text-[11px] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <span className="text-red-700">
              ¿Eliminar “{deleteTarget.nombre}” de la lista?
            </span>
            <div className="space-x-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-2 py-1 rounded-lg border border-red-100 text-red-600 hover:bg-red-100/60"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-2 py-1 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------- Modal NUEVO SOLICITANTE ---------------------- */

type NewSolicitanteContext = "solicitado_por" | "resp_tec" | "resp_eco";

type NewSolicitanteState =
  | {
      open: true;
      context: NewSolicitanteContext;
    }
  | {
      open: false;
      context: null;
    };

type NewSolicitanteModalProps = {
  state: NewSolicitanteState;
  existingSolicitantes: Solicitante[];
  onClose: () => void;
  onCreated: (nuevo: Solicitante, context: NewSolicitanteContext) => void;
};

function NewSolicitanteModal({
  state,
  existingSolicitantes,
  onClose,
  onCreated,
}: NewSolicitanteModalProps) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (state.open) {
      setNombre("");
      setCorreo("");
      setTelefono("");
      setErrorMsg(null);
      setIsClosing(false);
    }
  }, [state.open]);

  if (!state.open || !state.context) return null;

  const handleCloseWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleSave = async () => {
    const trimmedName = nombre.trim();
    if (!trimmedName) {
      setErrorMsg("El nombre es obligatorio.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const tableName =
        state.context === "solicitado_por" ? "solicitantes" : "responsables";

      const existing = existingSolicitantes.find(
        (s) => s.nombre.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existing) {
        onCreated(existing, state.context);
        handleCloseWithAnimation();
        return;
      }

      const payload: any = {
        nombre: trimmedName,
        correo: correo || null,
        telefono: telefono || null,
      };

      if (tableName === "responsables") {
        payload.tipo =
          state.context === "resp_tec"
            ? "TECNICO"
            : state.context === "resp_eco"
            ? "ECONOMICO"
            : "OTRO";
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select("id, nombre, correo, telefono")
        .single();

      if (error) {
        console.error(error);
        setErrorMsg(error.message);
        return;
      }

      const nuevo = data as Solicitante;
      onCreated(nuevo, state.context);
      handleCloseWithAnimation();
    } finally {
      setLoading(false);
    }
  };

  const titulo =
    state.context === "solicitado_por"
      ? "Nuevo solicitante"
      : state.context === "resp_tec"
      ? "Nuevo responsable técnico"
      : "Nuevo responsable económico";

  return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md transition-opacity duration-200">      <div
        className={`w-full max-w-md rounded-2xl bg-white shadow-2xl border border-sky-100 p-5 space-y-4 transform transition-all duration-200 ${
          isClosing
            ? "opacity-0 translate-y-2 scale-95"
            : "opacity-100 translate-y-0 scale-100"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">{titulo}</h2>
          <button
            type="button"
            onClick={handleCloseWithAnimation}
            className="text-xs text-slate-400 hover:text-slate-800"
          >
            Cerrar ✕
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Registra el contacto una sola vez. Luego podrás reutilizarlo en futuras
          cotizaciones sin volver a escribir sus datos.
        </p>

        {/* Campos */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className={labelBase}>Nombre completo</label>
            <input
              className={inputBase}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Juan Pérez – Nexa"
            />
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Correo</label>
            <input
              type="email"
              className={inputBase}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@empresa.com"
            />
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Teléfono</label>
            <input
              className={inputBase}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+51 9XX XXX XXX"
            />
          </div>
          {errorMsg && (
            <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleCloseWithAnimation}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-xs rounded-lg bg-sky-600 text-white font-semibold shadow hover:bg-sky-700 disabled:opacity-60 flex items-center gap-2"
          >
            {loading && <Spinner />}
            <span>{loading ? "Guardando…" : "Guardar contacto"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Modal simple (cliente / unidad / tipo / status) ---------------------- */

type SimpleOptionContext = "cliente" | "unidad" | "tipo" | "status";

type SimpleOptionState =
  | {
      open: true;
      context: SimpleOptionContext;
    }
  | {
      open: false;
      context: null;
    };

type SimpleOptionModalProps = {
  state: SimpleOptionState;
  onClose: () => void;
  onConfirm: (nombre: string, context: SimpleOptionContext) => void;
};

function SimpleOptionModal({
  state,
  onClose,
  onConfirm,
}: SimpleOptionModalProps) {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (state.open) {
      setNombre("");
      setErrorMsg(null);
      setIsClosing(false);
    }
  }, [state.open, state.context]);

  if (!state.open || !state.context) return null;

  const titulo =
    state.context === "cliente"
      ? "Nuevo cliente"
      : state.context === "unidad"
      ? "Nueva unidad minera"
      : state.context === "tipo"
      ? "Nuevo tipo de servicio"
      : "Nuevo estado de cotización";

  const placeholder =
    state.context === "cliente"
      ? "Ej.: Nexa Resources"
      : state.context === "unidad"
      ? "Ej.: Cajamarquilla"
      : state.context === "tipo"
      ? "Ej.: Ingeniería de detalle"
      : "Ej.: En evaluación, Entregada, Cerrada";

  const handleCloseWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSave = async () => {
    const trimmed = nombre.trim();
    if (!trimmed) {
      setErrorMsg("El nombre es obligatorio.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await onConfirm(trimmed, state.context);
      handleCloseWithAnimation();
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="fixed inset-0 z-45 flex items-center justify-center bg-slate-900/30 backdrop-blur-md transition-opacity duration-200">      <div
        className={`w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 p-5 space-y-4 transform transition-all duration-200 ${
          isClosing
            ? "opacity-0 translate-y-2 scale-95"
            : "opacity-100 translate-y-0 scale-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">{titulo}</h2>
          <button
            type="button"
            onClick={handleCloseWithAnimation}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            Cerrar ✕
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Este valor quedará disponible para futuros registros en la lista
          desplegable correspondiente.
        </p>

        <div className="space-y-1">
          <label className={labelBase}>Nombre</label>
          <input
            className={inputBase}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={placeholder}
          />
        </div>

        {errorMsg && (
          <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleCloseWithAnimation}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-xs rounded-lg bg-sky-600 text-white font-semibold shadow hover:bg-sky-700 disabled:opacity-60 flex items-center gap-2"
          >
            {loading && <Spinner />}
            <span>{loading ? "Guardando…" : "Guardar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Página/formulario principal (reutilizable) --------------------------- */

type TabId = "registro" | "seguimiento" | "economico" | "kpis";

/* -------- Helpers archivos -------- */

function getExtension(fileName: string): string {
  const ext = fileName.split(".").pop();
  return (ext || "").toLowerCase();
}

function FileTypeBadge({ fileName }: { fileName: string }) {
  const ext = getExtension(fileName);

  let style =
    "bg-slate-100 text-slate-700 border border-slate-200"; // default
  let label = ext ? ext.toUpperCase() : "FILE";

  switch (ext) {
    case "pdf":
      style = "bg-red-100 text-red-700 border border-red-200";
      label = "PDF";
      break;
    case "doc":
    case "docx":
      style = "bg-blue-100 text-blue-700 border border-blue-200";
      label = "DOCX";
      break;
    case "xls":
    case "xlsx":
      style = "bg-emerald-100 text-emerald-700 border border-emerald-200";
      label = "XLSX";
      break;
    case "ppt":
    case "pptx":
      style = "bg-orange-100 text-orange-700 border border-orange-200";
      label = "PPTX";
      break;
    case "dwg":
    case "dxf":
      style = "bg-cyan-100 text-cyan-700 border border-cyan-200";
      label = "DWG";
      break;
    case "zip":
    case "rar":
    case "7z":
      style = "bg-amber-100 text-amber-700 border border-amber-200";
      label = "ZIP";
      break;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      style = "bg-purple-100 text-purple-700 border border-purple-200";
      label = "IMG";
      break;
  }

  return (
    <span
      className={
        "inline-flex h-7 items-center justify-center rounded-md px-2 text-[10px] font-semibold uppercase tracking-wide " +
        style
      }
    >
      {label}
    </span>
  );
}

/* --------- Props del componente reutilizable --------- */

type NuevaCotizacionProps = {
  mode: "new" | "edit";
  row: any | null;
  onSaved: () => void;
  onCancel: () => void;
};

export function NuevaCotizacion({
  mode,
  row,
  onSaved,
  onCancel,
}: NuevaCotizacionProps) {
  const [activeTab, setActiveTab] = useState<TabId>("registro");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [cotizacionError, setCotizacionError] = useState<string | null>(null);
  const [codigoDisponible, setCodigoDisponible] = useState<string | null>(null);

  // archivos
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  // listas
  const [clientes, setClientes] = useState<OpcionSimple[]>([]);
  const [unidades, setUnidades] = useState<OpcionSimple[]>([]);
  const [tiposServicio, setTiposServicio] = useState<OpcionSimple[]>([]);
  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([]);
  const [statusCotList, setStatusCotList] = useState<OpcionSimple[]>([]);
  const [responsables, setResponsables] = useState<Solicitante[]>([]);

  // modales
  const [optionManager, setOptionManager] = useState<OptionManagerState>(
    initialOptionManagerState
  );

  const [newSolicState, setNewSolicState] = useState<NewSolicitanteState>({
    open: false,
    context: null,
  });

  const [simpleOptionState, setSimpleOptionState] = useState<SimpleOptionState>({
    open: false,
    context: null,
  });

  const [form, setForm] = useState({
    // REGISTRO
    cotizacion: "",
    descripcion: "",
    cliente: "",
    unidad_minera: "",
    tipo_servicio: "",
    solicitado_por: "",
    correo_solicitante: "",
    telefono_solicitante: "",
    prioridad: "",
    estado_cotizacion: "",
    status_proyecto: "",
    fecha_invitacion: "",
    fecha_confirmacion: "",
    fecha_visita_tec: "",
    fecha_consultas: "",
    fecha_abs_consultas: "",
    fecha_entrega: "",
    link_carpeta_drive: "",
    // SEGUIMIENTO
    responsable: "",
    correo_resp_tec: "",
    telefono_resp_tec: "",
    responsable_economico: "",
    correo_resp_eco: "",
    telefono_resp_eco: "",
    estado_propuesta: "",
    fecha_envio_propuesta: "",
    hora_envio_propuesta: "",
    dias_vencimiento: "",
    enviado_a_tiempo: false,
    requiere_visita_tecnica: false,
    visita_ejecutada: false,
    tiempo_respuesta_dias: "",
    semana_iso: "",
    mes_anio: "",
    oc: "",
    f_oc: "",
    observacion: "",
    oferta_tecnica: "",
    oferta_economica: "",
    estado_pipeline: "",
  });

  /* ------------ helpers de cambio de inputs ------------ */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    if (name === "cotizacion") {
      setCotizacionError(null);
    }

    if (type === "checkbox") {
      setForm((p) => ({ ...p, [name]: checked }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const validarCotizacionEnSupabase = async (codigo: string) => {
    const valor = codigo.trim();
    if (!valor) {
      setCotizacionError(null);
      return;
    }

    let query = supabase
      .from("Log de Cotizaciones")
      .select("id")
      .eq("cotizacion", valor)
      .limit(1);

    if (mode === "edit" && row?.id) {
      // excluimos el propio registro
      query = query.neq("id", row.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al validar cotización:", error.message);
      return;
    }

    if (data && data.length > 0) {
      setCotizacionError("Este código ya existe en el Log de Cotizaciones.");
    } else {
      setCotizacionError(null);
    }
  };

  const handleSolicitadoPorChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const nombre = e.target.value;
    const sel = solicitantes.find((s) => s.nombre === nombre);
    setForm((p) => ({
      ...p,
      solicitado_por: nombre,
      correo_solicitante: sel?.correo ?? "",
      telefono_solicitante: sel?.telefono ?? "",
    }));
  };

  const handleResponsableTecChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const nombre = e.target.value;
    const sel = responsables.find((s) => s.nombre === nombre);
    setForm((p) => ({
      ...p,
      responsable: nombre,
      correo_resp_tec: sel?.correo ?? "",
      telefono_resp_tec: sel?.telefono ?? "",
    }));
  };

  const handleResponsableEcoChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const nombre = e.target.value;
    const sel = responsables.find((s) => s.nombre === nombre);
    setForm((p) => ({
      ...p,
      responsable_economico: nombre,
      correo_resp_eco: sel?.correo ?? "",
      telefono_resp_eco: sel?.telefono ?? "",
    }));
  };

  /* ------------ carga inicial: listas + código sugerido / datos edición ------------ */

  const recargarOpciones = async () => {
    const [cliRes, uniRes, tipRes, solRes, respRes, statRes] = await Promise.all([
      supabase.from("clientes").select("id, nombre").order("nombre"),
      supabase.from("unidades_minera").select("id, nombre").order("nombre"),
      supabase.from("tipos_servicio").select("id, nombre").order("nombre"),

      supabase
        .from("solicitantes")
        .select("id, nombre, correo, telefono")
        .order("nombre"),

      supabase
        .from("responsables")
        .select("id, nombre, correo, telefono")
        .order("nombre"),

      supabase
        .from("status_cotizacion_catalogo")
        .select("id, nombre")
        .order("nombre"),
    ]);

    if (!cliRes.error && cliRes.data)
      setClientes(cliRes.data as OpcionSimple[]);
    if (!uniRes.error && uniRes.data)
      setUnidades(uniRes.data as OpcionSimple[]);
    if (!tipRes.error && tipRes.data)
      setTiposServicio(tipRes.data as OpcionSimple[]);
    if (!solRes.error && solRes.data)
      setSolicitantes(solRes.data as unknown as Solicitante[]);
    if (!respRes.error && respRes.data)
      setResponsables(respRes.data as unknown as Solicitante[]);
    if (!statRes.error && statRes.data)
      setStatusCotList(statRes.data as OpcionSimple[]);
  };

  useEffect(() => {
    const cargar = async () => {
      await recargarOpciones();

      if (mode === "edit" && row) {
        // precarga de datos existentes
        setForm((p) => ({
          ...p,
          cotizacion: row.cotizacion ?? "",
          descripcion: row.descripcion ?? "",
          cliente: row.cliente ?? "",
          unidad_minera: row.unidad_minera ?? "",
          tipo_servicio: row.tipo_servicio ?? "",
          solicitado_por: row.solicitado_por ?? "",
          correo_solicitante: row.correo_solicitante ?? "",
          telefono_solicitante: row.telefono_solicitante ?? "",
          prioridad: row.prioridad ?? "",
          estado_cotizacion: row.estado_cotizacion ?? "",
          status_proyecto: row.status_proyecto ?? "",
          fecha_invitacion: row.fecha_invitacion ?? "",
          fecha_confirmacion: row.fecha_confirmacion ?? "",
          fecha_visita_tec: row.fecha_visita_tec ?? "",
          fecha_consultas: row.fecha_consultas ?? "",
          fecha_abs_consultas: row.fecha_abs_consultas ?? "",
          fecha_entrega: row.fecha_entrega ?? "",
          link_carpeta_drive: row.link_carpeta_drive ?? "",
          responsable: row.responsable ?? "",
          correo_resp_tec: row.correo_resp_tec ?? "",
          telefono_resp_tec: row.telefono_resp_tec ?? "",
          responsable_economico: row.responsable_economico ?? "",
          correo_resp_eco: row.correo_resp_eco ?? "",
          telefono_resp_eco: row.telefono_resp_eco ?? "",
          estado_propuesta: row.estado_propuesta ?? "",
          fecha_envio_propuesta: row.fecha_envio_propuesta ?? "",
          hora_envio_propuesta: row.hora_envio_propuesta ?? "",
          dias_vencimiento: row.dias_vencimiento
            ? String(row.dias_vencimiento)
            : "",
          enviado_a_tiempo: !!row.enviado_a_tiempo,
          requiere_visita_tecnica: !!row.requiere_visita_tecnica,
          visita_ejecutada: !!row.visita_ejecutada,
          tiempo_respuesta_dias: row.tiempo_respuesta_dias
            ? String(row.tiempo_respuesta_dias)
            : "",
          semana_iso: row.semana_iso ?? "",
          mes_anio: row.mes_anio ?? "",
          oc: row.oc ?? "",
          f_oc: row.f_oc ?? "",
          observacion: row.observacion ?? "",
          oferta_tecnica: row.oferta_tecnica ?? "",
          oferta_economica: row.oferta_economica ?? "",
          estado_pipeline: row.estado_pipeline ?? "",
        }));
        setCodigoDisponible(null);
        setCotizacionError(null);
        return;
      }

      // modo "new": sugerimos siguiente código
      const year = new Date().getFullYear();
      let sugerido = `FOR-EKA-PRO-3_${year}-001`;

      const { data: lastCot } = await supabase
        .from("Log de Cotizaciones")
        .select("cotizacion")
        .ilike("cotizacion", "FOR-EKA-PRO-3_%")
        .order("cotizacion", { ascending: false })
        .limit(1);

      if (lastCot && lastCot.length > 0 && lastCot[0].cotizacion) {
        const match = lastCot[0].cotizacion.match(
          /FOR-EKA-PRO-3_(\d{4})-(\d{3})/i
        );
        if (match) {
          const lastYear = parseInt(match[1], 10);
          const lastSeq = parseInt(match[2], 10);
          if (lastYear === year) {
            const nextSeq = String(lastSeq + 1).padStart(3, "0");
            sugerido = `FOR-EKA-PRO-3_${year}-${nextSeq}`;
          }
        }
      }
      setCodigoDisponible(sugerido);
      setForm((p) => ({ ...p, cotizacion: sugerido }));
    };

    cargar();
  }, [mode, row]);

  /* ------------------------------- Alta simple (cliente / unidad / tipo / status) ------------------------------- */

  const agregarCliente = () => {
    setSimpleOptionState({ open: true, context: "cliente" });
  };

  const agregarUnidad = () => {
    setSimpleOptionState({ open: true, context: "unidad" });
  };

  const agregarTipoServicio = () => {
    setSimpleOptionState({ open: true, context: "tipo" });
  };

  const agregarStatusCot = () => {
    setSimpleOptionState({ open: true, context: "status" });
  };

  const handleSimpleOptionConfirm = async (
    nombre: string,
    context: SimpleOptionContext
  ) => {
    let errorMessage: string | null = null;

    if (context === "cliente") {
      const { error } = await supabase.from("clientes").insert({ nombre });
      if (error) errorMessage = error.message;
      else {
        await recargarOpciones();
        setForm((p) => ({ ...p, cliente: nombre }));
      }
    } else if (context === "unidad") {
      const { error } = await supabase.from("unidades_minera").insert({
        nombre,
      });
      if (error) errorMessage = error.message;
      else {
        await recargarOpciones();
        setForm((p) => ({ ...p, unidad_minera: nombre }));
      }
    } else if (context === "tipo") {
      const { error } = await supabase.from("tipos_servicio").insert({
        nombre,
      });
      if (error) errorMessage = error.message;
      else {
        await recargarOpciones();
        setForm((p) => ({ ...p, tipo_servicio: nombre }));
      }
    } else {
      const { error } = await supabase
        .from("status_cotizacion_catalogo")
        .insert({ nombre });
      if (error) errorMessage = error.message;
      else {
        await recargarOpciones();
        setForm((p) => ({ ...p, estado_cotizacion: nombre }));
      }
    }

    if (errorMessage) {
      console.error(errorMessage);
      setMensaje(`❌ Error al guardar: ${errorMessage}`);
    }
  };

  /* ---------- helpers para abrir modal NUEVO solicitante ---------- */

  const abrirNuevoSolicitante = (context: NewSolicitanteContext) => {
    setNewSolicState({ open: true, context });
  };

  const handleSolicitanteCreated = async (
    nuevo: Solicitante,
    context: NewSolicitanteContext
  ) => {
    await recargarOpciones();

    setForm((p) => {
      if (context === "solicitado_por") {
        return {
          ...p,
          solicitado_por: nuevo.nombre,
          correo_solicitante: nuevo.correo ?? "",
          telefono_solicitante: nuevo.telefono ?? "",
        };
      }
      if (context === "resp_tec") {
        return {
          ...p,
          responsable: nuevo.nombre,
          correo_resp_tec: nuevo.correo ?? "",
          telefono_resp_tec: nuevo.telefono ?? "",
        };
      }
      return {
        ...p,
        responsable_economico: nuevo.nombre,
        correo_resp_eco: nuevo.correo ?? "",
        telefono_resp_eco: nuevo.telefono ?? "",
      };
    });

    setNewSolicState({ open: false, context: null });
  };

  /* ------------------------- archivos ------------------------- */

  const handleRemoveUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const subirArchivoConProgreso = async (id: string, file: File) => {
    setUploads((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, progress: 10, error: undefined } : u
      )
    );

    const intervalId = window.setInterval(() => {
      setUploads((prev) =>
        prev.map((u) => {
          if (u.id !== id) return u;
          const next = u.progress < 90 ? u.progress + 5 : u.progress;
          return { ...u, progress: next };
        })
      );
    }, 300);

    try {
      const sanitizedName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const filePath = `cotizaciones/${Date.now()}-${sanitizedName}`;

      const { error } = await supabase.storage
        .from("cotizaciones")
        .upload(filePath, file);

      window.clearInterval(intervalId);

      if (error) {
        console.error("Error al subir archivo:", error.message);
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, progress: 0, error: error.message } : u
          )
        );
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("cotizaciones").getPublicUrl(filePath);

      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, progress: 100, url: publicUrl } : u
        )
      );
    } catch (err: any) {
      window.clearInterval(intervalId);
      console.error("Error inesperado al subir archivo:", err);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, progress: 0, error: err?.message ?? "Error inesperado" }
            : u
        )
      );
    }
  };

  const handleArchivosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems: UploadItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      progress: 0,
    }));

    setUploads((prev) => [...prev, ...newItems]);

    newItems.forEach((item) => subirArchivoConProgreso(item.id, item.file));

    e.target.value = "";
  };

  const archivosUrls = uploads
    .filter((u) => !!u.url)
    .map((u) => u.url as string);

  /* ------------------------------- submit ------------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setCotizacionError(null);
    setLoadingSubmit(true);

    try {
      // 1) Verificar duplicado de cotización (excluyendo el propio id en edición)
      let query = supabase
        .from("Log de Cotizaciones")
        .select("id")
        .eq("cotizacion", form.cotizacion)
        .limit(1);

      if (mode === "edit" && row?.id) {
        query = query.neq("id", row.id);
      }

      const { data: existing, error: existingError } = await query;

      if (existingError) {
        console.error("Error al verificar cotización existente:", existingError);
        throw existingError;
      }

      if (existing && existing.length > 0) {
        setCotizacionError("Esta cotización ya está registrada.");
        setMensaje("❌ La cotización ingresada ya existe. Usa otro código.");
        return;
      }

      const urls = archivosUrls;

      const payload: any = {
        cotizacion: form.cotizacion,
        descripcion: form.descripcion || null,
        cliente: form.cliente || null,
        unidad_minera: form.unidad_minera || null,
        tipo_servicio: form.tipo_servicio || null,
        solicitado_por: form.solicitado_por || null,
        correo_solicitante: form.correo_solicitante || null,
        telefono_solicitante: form.telefono_solicitante || null,
        prioridad: form.prioridad || null,
        estado_cotizacion: form.estado_cotizacion || null,
        status_proyecto: form.status_proyecto || null,
        fecha_invitacion: form.fecha_invitacion || null,
        fecha_confirmacion: form.fecha_confirmacion || null,
        fecha_visita_tec: form.fecha_visita_tec || null,
        fecha_consultas: form.fecha_consultas || null,
        fecha_abs_consultas: form.fecha_abs_consultas || null,
        fecha_entrega: form.fecha_entrega || null,
        link_carpeta_drive: form.link_carpeta_drive || null,
        responsable: form.responsable || null,
        correo_resp_tec: form.correo_resp_tec || null,
        telefono_resp_tec: form.telefono_resp_tec || null,
        responsable_economico: form.responsable_economico || null,
        correo_resp_eco: form.correo_resp_eco || null,
        telefono_resp_eco: form.telefono_resp_eco || null,
        estado_propuesta: form.estado_propuesta || null,
        fecha_envio_propuesta: form.fecha_envio_propuesta || null,
        hora_envio_propuesta: form.hora_envio_propuesta || null,
        dias_vencimiento: form.dias_vencimiento
          ? Number(form.dias_vencimiento)
          : null,
        enviado_a_tiempo: form.enviado_a_tiempo,
        requiere_visita_tecnica: form.requiere_visita_tecnica,
        visita_ejecutada: form.visita_ejecutada,
        tiempo_respuesta_dias: form.tiempo_respuesta_dias
          ? Number(form.tiempo_respuesta_dias)
          : null,
        semana_iso: form.semana_iso || null,
        mes_anio: form.mes_anio || null,
        oc: form.oc || null,
        f_oc: form.f_oc || null,
        observacion: form.observacion || null,
        oferta_tecnica: form.oferta_tecnica || null,
        oferta_economica: form.oferta_economica || null,
        estado_pipeline: form.estado_pipeline || null,
        links_adjuntos: urls.length > 0 ? urls : null,
      };

      let logErr;

      if (mode === "new") {
        const { error } = await supabase
          .from("Log de Cotizaciones")
          .insert(payload);
        logErr = error;
      } else {
        if (!row?.id) {
          throw new Error("No se encontró el ID de la cotización a editar.");
        }
        const { error } = await supabase
          .from("Log de Cotizaciones")
          .update(payload)
          .eq("id", row.id);
        logErr = error;
      }

      if (logErr) {
        console.error(logErr);
        throw logErr;
      }

      if (mode === "new") {
        setMensaje("✅ Cotización registrada correctamente.");
        setUploads([]);

        // Recalcular siguiente código disponible
        const year = new Date().getFullYear();
        let siguiente = `FOR-EKA-PRO-3_${year}-001`;

        const { data: lastCot } = await supabase
          .from("Log de Cotizaciones")
          .select("cotizacion")
          .ilike("cotizacion", "FOR-EKA-PRO-3_%")
          .order("cotizacion", { ascending: false })
          .limit(1);

        if (lastCot && lastCot.length > 0 && lastCot[0].cotizacion) {
          const match = lastCot[0].cotizacion.match(
            /FOR-EKA-PRO-3_(\d{4})-(\d{3})/i
          );
          if (match) {
            const lastYear = parseInt(match[1], 10);
            const lastSeq = parseInt(match[2], 10);
            if (lastYear === year) {
              const nextSeq = String(lastSeq + 1).padStart(3, "0");
              siguiente = `FOR-EKA-PRO-3_${year}-${nextSeq}`;
            }
          }
        }

        setCodigoDisponible(siguiente);
        setForm((p) => ({ ...p, cotizacion: siguiente }));
      } else {
        setMensaje("✅ Cotización actualizada correctamente.");
      }

      // Avisamos al padre (page.tsx) para recargar tabla y cerrar modal
      onSaved();
    } catch (err: any) {
      console.error(err);
      setMensaje(`❌ Error al guardar: ${err.message ?? "Revisa la consola"}`);
    } finally {
      setLoadingSubmit(false);
    }
  };

  /* --------------------------- render tabs --------------------------- */

const renderRegistroTab = () => (
  // 👇 un poco de padding extra abajo para que la última fila no quede pegada
  <div className="space-y-6 pb-4">
    {/* FILA 1: Cotización + Descripción */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
      {/* Cotización */}
      <div className="md:col-span-1 flex flex-col space-y-1">
        <label className={labelBase}>Cotización</label>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              name="cotizacion"
              value={form.cotizacion}
              onChange={handleChange}
              onBlur={(e) => validarCotizacionEnSupabase(e.target.value)}
              className={`${inputBase} font-mono bg-white w-full ${
                cotizacionError
                  ? "border-[2.5px] border-red-500 shadow-[0_0_6px_rgba(255,0,0,0.35)] pr-9 input-error-shake"
                  : ""
              }`}
              required
              pattern="FOR-EKA-PRO-3_[0-9]{4}-[0-9]{3}"
              title="Formato: FOR-EKA-PRO-3_2025-001"
            />
            {cotizacionError && (
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-red-500 text-xs">
                ⚠️
              </span>
            )}
          </div>

          {mode === "new" && codigoDisponible && (
            <button
              type="button"
              onClick={() => {
                setForm((p) => ({
                  ...p,
                  cotizacion: codigoDisponible ?? "",
                }));
                setCotizacionError(null);
                validarCotizacionEnSupabase(codigoDisponible ?? "");
              }}
              className="h-10 w-10 flex items-center justify-center rounded-lg bg-sky-600 text-white text-lg hover:bg-sky-700 active:scale-95 transition"
              title="Usar código disponible"
            >
              ↻
            </button>
          )}
        </div>

        {cotizacionError && (
          <p className="text-[11px] text-red-600 mt-1">
            Este código ya existe en el Log de Cotizaciones.
          </p>
        )}

        {mode === "new" && codigoDisponible && (
          <p className="text-[11px] text-slate-500 mt-0.5">
            Disponible:{" "}
            <span className="font-mono font-semibold">
              {codigoDisponible}
            </span>
          </p>
        )}
      </div>

      {/* Descripción */}
      <div className="md:col-span-2 space-y-1">
        <label className={labelBase}>Descripción</label>
        <textarea
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          className={`${inputBase} h-10 resize-none bg-white`}
        />
      </div>
    </div>

    {/* Fila 2: Cliente / Unidad minera / Tipo de servicio */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
      <SelectWithActions
        label="Cliente"
        name="cliente"
        value={form.cliente}
        options={clientes}
        onChange={(e) =>
          setForm((p) => ({ ...p, cliente: e.target.value || "" }))
        }
        onNew={agregarCliente}
        onEdit={() =>
          setOptionManager({
            open: true,
            table: "clientes",
            title: "Clientes",
          })
        }
      />
      <SelectWithActions
        label="Unidad minera"
        name="unidad_minera"
        value={form.unidad_minera}
        options={unidades}
        onChange={(e) =>
          setForm((p) => ({ ...p, unidad_minera: e.target.value || "" }))
        }
        onNew={agregarUnidad}
        onEdit={() =>
          setOptionManager({
            open: true,
            table: "unidades_minera",
            title: "Unidades mineras",
          })
        }
      />

      <SelectWithActions
        label="Tipo de servicio"
        name="tipo_servicio"
        value={form.tipo_servicio}
        options={tiposServicio}
        onChange={(e) =>
          setForm((p) => ({ ...p, tipo_servicio: e.target.value || "" }))
        }
        onNew={agregarTipoServicio}
        onEdit={() =>
          setOptionManager({
            open: true,
            table: "tipos_servicio",
            title: "Tipos de servicio",
          })
        }
      />
    </div>

    {/* Bloque 3 columnas */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 items-start">
      {/* Columna 1: Solicitante */}
      <div className="space-y-2">
        <SelectWithActions
          label="Solicitado por"
          name="solicitado_por"
          value={form.solicitado_por}
          options={solicitantes}
          onChange={handleSolicitadoPorChange}
          onNew={() => abrirNuevoSolicitante("solicitado_por")}
          onEdit={() =>
            setOptionManager({
              open: true,
              table: "solicitantes",
              title: "Solicitantes / Contactos",
            })
          }
        />

        <div className="space-y-1">
          <label className={labelBase}>Correo</label>
          <input
            type="email"
            name="correo_solicitante"
            value={form.correo_solicitante}
            onChange={handleChange}
            className={`${inputBase} bg-white`}
          />
        </div>

        <div className="space-y-1">
          <label className={labelBase}>Teléfono</label>
          <input
            name="telefono_solicitante"
            value={form.telefono_solicitante}
            onChange={handleChange}
            className={`${inputBase} bg-white`}
          />
        </div>

        <div className="space-y-1">
          <label className={labelBase}>Prioridad</label>
          <select
            name="prioridad"
            value={form.prioridad}
            onChange={handleChange}
            className={`${inputBase} bg-white`}
          >
            <option value="">Seleccione…</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
        </div>

        <SelectWithActions
          label="Status Cotización"
          name="estado_cotizacion"
          value={form.estado_cotizacion}
          options={statusCotList}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              estado_cotizacion: e.target.value || "",
            }))
          }
          onNew={agregarStatusCot}
          onEdit={() =>
            setOptionManager({
              open: true,
              table: "status_cotizacion_catalogo",
              title: "Status de Cotización",
            })
          }
        />

        <div className="space-y-1">
          <label className={labelBase}>Status Proyecto</label>
          <select
            name="status_proyecto"
            value={form.status_proyecto}
            onChange={handleChange}
            className={`${inputBase} bg-white`}
          >
            <option value="">Seleccione…</option>
            <option value="Licitación">Licitación</option>
            <option value="Sin iniciar">Sin iniciar</option>
            <option value="En curso">En curso</option>
            <option value="Cerrado">Cerrado</option>
            <option value="Suspendido">Suspendido</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className={labelBase}>
            Referencia principal (texto o link)
          </label>
          <input
            name="link_carpeta_drive"
            value={form.link_carpeta_drive}
            onChange={handleChange}
            className={`${inputBase} bg-white`}
            placeholder="Ej.: URL de Gmail, carpeta de Drive, descripción breve…"
          />
        </div>
      </div>

      {/* Columna 2: Fechas */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-2">
          {[
            ["fecha_invitacion", "Fecha invitación"],
            ["fecha_confirmacion", "Fecha confirmación"],
            ["fecha_visita_tec", "Fecha visita técnica"],
            ["fecha_consultas", "Fecha consultas"],
            ["fecha_abs_consultas", "Fecha absolución consultas"],
            ["fecha_entrega", "Fecha entrega"],
          ].map(([name, label]) => (
            <div key={name} className="space-y-1">
              <label className={labelBase}>{label}</label>
              <input
                type="date"
                name={name}
                value={(form as any)[name] ?? ""}
                onChange={handleChange}
                className={`${inputBase} bg-white`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Columna 3: Archivos adjuntos */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Archivos adjuntos
        </h3>

<label className="block">
  <div className="border-2 border-dashed border-sky-200 rounded-xl p-4 text-center text-xs text-slate-500 bg-sky-50/40 hover:border-sky-400 hover:bg-sky-50 cursor-pointer transition">
    <p className="font-medium text-slate-600 mb-1">
      Seleccionar archivos
    </p>
    <p>
      Haz clic para elegir uno o varios archivos (bases, invitación,
      ZIP, etc.)
    </p>
  </div>
  <input
    type="file"
    multiple
    className="hidden"
    onChange={handleArchivosChange}
  />
</label>


        {uploads.length > 0 && (
          <ul className="mt-2 space-y-2">
            {uploads.map((u) => (
              <li key={u.id}>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileTypeBadge fileName={u.file.name} />
                    <span className="text-xs text-slate-700 truncate flex-1">
                      {u.file.name}
                    </span>

                    {u.url && (
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[14px] text-slate-600 hover:bg-sky-100 hover:text-sky-700 transition shrink-0"
                        title="Descargar archivo"
                      >
                        ⬇️
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveUpload(u.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[13px] text-slate-500 hover:bg-red-100 hover:text-red-600 transition shrink-0"
                      title="Quitar de la lista"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        u.url ? "bg-emerald-500" : "bg-sky-500"
                      }`}
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>

                  <div className="mt-1 text-[10px] text-slate-400 text-right">
                    {u.error
                      ? `Error: ${u.error}`
                      : u.url && u.progress === 100
                      ? "Listo"
                      : `${Math.round(u.progress)}%`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);


  const renderSeguimientoTab = () => (
    <div className="space-y-8">
      {/* Responsables */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Responsables
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <SelectWithActions
            label="Responsable técnico"
            name="responsable"
            value={form.responsable}
            options={responsables}
            onChange={handleResponsableTecChange}
            onNew={() => abrirNuevoSolicitante("resp_tec")}
            onEdit={() =>
              setOptionManager({
                open: true,
                table: "responsables",
                title: "Responsables",
              })
            }
          />

          <div className="space-y-1">
            <label className={labelBase}>Correo resp. técnico</label>
            <input
              name="correo_resp_tec"
              value={form.correo_resp_tec}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Teléfono resp. técnico</label>
            <input
              name="telefono_resp_tec"
              value={form.telefono_resp_tec}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SelectWithActions
            label="Responsable económico"
            name="responsable_economico"
            value={form.responsable_economico}
            options={responsables}
            onChange={handleResponsableEcoChange}
            onNew={() => abrirNuevoSolicitante("resp_eco")}
            onEdit={() =>
              setOptionManager({
                open: true,
                table: "responsables",
                title: "Responsables",
              })
            }
          />

          <div className="space-y-1">
            <label className={labelBase}>Correo resp. económico</label>
            <input
              name="correo_resp_eco"
              value={form.correo_resp_eco}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Teléfono resp. económico</label>
            <input
              name="telefono_resp_eco"
              value={form.telefono_resp_eco}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
            />
          </div>
        </div>
      </div>

      {/* Seguimiento de la propuesta */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Seguimiento de la propuesta
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className={labelBase}>Estado propuesta</label>
            <input
              name="estado_propuesta"
              value={form.estado_propuesta}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
              placeholder="Ej.: En revisión, Aprobada, Desestimada…"
            />
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Fecha envío propuesta</label>
            <input
              type="date"
              name="fecha_envio_propuesta"
              value={form.fecha_envio_propuesta}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Hora envío propuesta</label>
            <input
              type="time"
              name="hora_envio_propuesta"
              value={form.hora_envio_propuesta}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className={labelBase}>Días de vigencia</label>
            <input
              name="dias_vencimiento"
              value={form.dias_vencimiento}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Enviado a tiempo</label>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                name="enviado_a_tiempo"
                checked={form.enviado_a_tiempo}
                onChange={handleChange}
              />
              <span>Sí</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Tiempo respuesta cliente (días)</label>
            <input
              name="tiempo_respuesta_dias"
              value={form.tiempo_respuesta_dias}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className={labelBase}>Requiere visita técnica</label>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                name="requiere_visita_tecnica"
                checked={form.requiere_visita_tecnica}
                onChange={handleChange}
              />
              <span>Sí</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Visita ejecutada</label>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                name="visita_ejecutada"
                checked={form.visita_ejecutada}
                onChange={handleChange}
              />
              <span>Sí</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Semana ISO</label>
            <input
              name="semana_iso"
              value={form.semana_iso}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
              placeholder="Ej.: 2025-W03"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className={labelBase}>Mes / Año</label>
            <input
              name="mes_anio"
              value={form.mes_anio}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
              placeholder="Ej.: 01-2025"
            />
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Orden de compra (OC)</label>
            <input
              name="oc"
              value={form.oc}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelBase}>Fecha OC</label>
            <input
              type="date"
              name="f_oc"
              value={form.f_oc}
              onChange={handleChange}
              className={`${inputBase} bg-white`}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelBase}>Observaciones</label>
          <textarea
            name="observacion"
            value={form.observacion}
            onChange={handleChange}
            className={`${inputBase} h-20 resize-none bg-white`}
          />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-slate-500">
          Los archivos de oferta técnica / económica se cargan en el bloque
          <span className="font-semibold"> “Archivos adjuntos”</span> de la
          pestaña Registro (se comparte entre pestañas).
        </p>
      </div>
    </div>
  );

  const renderEconomicoTab = () => (
    <div className="space-y-6 text-sm text-slate-600">
      <p>
        En esta pestaña más adelante mostraremos información económica,
        vinculación con Requerimientos y el avance (% de atención). De momento,
        puedes usar las columnas económicas de la tabla{" "}
        <span className="font-mono">Log de Cotizaciones</span> directamente en
        Supabase / Metabase.
      </p>
      <p>
        También reutilizamos los <strong>Archivos adjuntos</strong> del
        Registro para almacenar ofertas técnicas / económicas, bases,
        aclaraciones, etc.
      </p>
      <p className="text-xs text-slate-500">
        Cuando estés listo podemos transformar esta pestaña en una vista de
        detalle con líneas de requerimientos, márgenes, moneda normalizada,
        etc., pensada para tu flujo PMBOK 6ª edición.
      </p>
    </div>
  );

  const renderKpisTab = () => (
    <div className="space-y-4 text-sm text-slate-600">
      <p>
        Aquí construiremos un tablero de KPIs (ratio de ganadas/perdidas,
        tiempos de respuesta, cobertura de propuestas, etc.). Lo ideal es
        conectarlo luego con Metabase para análisis avanzado y dashboards
        ejecutivos.
      </p>
      <p className="text-xs text-slate-500">
        Cuando tengamos definidos tus indicadores clave te preparo esta pestaña
        con gráficas (barras, líneas, embudos) y filtros por cliente, unidad
        minera, tipo de servicio, responsable, etc.
      </p>
    </div>
  );

  /* ------------------------------ JSX principal ------------------------------ */

const titulo = mode === "new" ? "Nueva Cotización" : "Editar cotización";

  return (
  <form
    onSubmit={handleSubmit}
    className="flex h-full flex-col bg-white"
  >
    {/* ================= HEADER FIJO (Título + botones) ================= */}
    <div className="flex-shrink-0 border-b border-slate-200 px-8 pt-6 pb-3 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {titulo}
        </h1>

        {mode === "edit" && form.cotizacion && (
          <p className="mt-1 text-xs text-slate-500">
            Cotización:&nbsp;
            <span className="font-mono font-semibold">
              {form.cotizacion}
            </span>
          </p>
        )}


      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm hover:bg-slate-200 active:scale-[0.98] transition whitespace-nowrap"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loadingSubmit}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold shadow-md hover:bg-sky-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        >
          {loadingSubmit
            ? mode === "new"
              ? "Guardando…"
              : "Actualizando…"
            : mode === "new"
            ? "Guardar Cotización"
            : "Guardar cambios"}
        </button>
      </div>
    </div>

    {/* ================= TABS (también fijos, SIN SCROLL) ================= */}
    <div className="flex-shrink-0 px-8 pt-2 pb-2 border-b border-slate-200">
      <div className="flex gap-6 text-xs font-semibold text-slate-500 flex-wrap">
        {[
          ["registro", "Registro"],
          ["seguimiento", "Seguimiento"],
          ["economico", "Económico / Requerimientos"],
          ["kpis", "KPIs"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id as TabId)}
className={`pb-2 border-b-2 -mb-px transition whitespace-nowrap ${
  activeTab === id
    ? "border-sky-600 text-sky-700"
    : "border-transparent hover:text-slate-800 hover:border-slate-300"
}`}

          >
            {label}
          </button>
        ))}
      </div>
    </div>

    {/* ================= MENSAJE (SI EXISTE) ================= */}
    {mensaje && (
      <div className="flex-shrink-0 px-8 pt-2">
        <div
          className={`text-sm text-center px-3 py-2 rounded-xl ${
            mensaje.startsWith("✅")
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-red-50 text-red-700 border border-red-100"
          }`}
        >
          {mensaje}
        </div>
      </div>
    )}

{/* CONTENIDO SCROLLEABLE (solo lo de abajo) */}
<div className="flex-1 px-8 pt-4 pb-8 overflow-y-auto overflow-x-auto">
  {activeTab === "registro" && renderRegistroTab()}
  {activeTab === "seguimiento" && renderSeguimientoTab()}
  {activeTab === "economico" && renderEconomicoTab()}
  {activeTab === "kpis" && renderKpisTab()}
</div>


    {/* ================= MODALES INTERNOS ================= */}
    <OptionManagerModal
      state={optionManager}
      onClose={() => setOptionManager(initialOptionManagerState)}
      onChanged={recargarOpciones}
    />

    <NewSolicitanteModal
      state={newSolicState}
      existingSolicitantes={
        newSolicState.context === "solicitado_por"
          ? solicitantes
          : responsables
      }
      onClose={() => setNewSolicState({ open: false, context: null })}
      onCreated={handleSolicitanteCreated}
    />

    <SimpleOptionModal
      state={simpleOptionState}
      onClose={() => setSimpleOptionState({ open: false, context: null })}
      onConfirm={handleSimpleOptionConfirm}
    />
  </form>
);

}
