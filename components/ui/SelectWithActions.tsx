// components/ui/SelectWithActions.tsx
"use client";

import React from "react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { inputBase, labelBase } from "./formStyles";

type OptionItem = {
  id: string;
  nombre: string;
};

type SelectWithActionsProps = {
  label: string;
  name: string;
  value: string;
  options: OptionItem[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onNew?: () => void;
  onEdit?: () => void;
};

export function SelectWithActions({
  label,
  name,
  value,
  options,
  onChange,
  onNew,
  onEdit,
}: SelectWithActionsProps) {
  return (
    <div className="space-y-1">
      <label className={labelBase}>{label}</label>

      <div className="flex gap-2">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={`${inputBase} flex-1 bg-white`}
        >
          <option value="">Seleccione…</option>
          {options.map((o) => (
            <option key={o.id} value={o.nombre}>
              {o.nombre}
            </option>
          ))}
        </select>

        {/* Botón NUEVO */}
        {onNew && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();   // evita submit del form
              e.stopPropagation();  // evita propagación rara
              onNew();
            }}
            className="w-10 h-10 rounded-lg bg-blue-600 text-white text-2xl font-bold shadow-sm flex items-center justify-center hover:bg-blue-700 active:scale-95 transition"
            aria-label="Agregar nuevo"
          >
            +
          </button>
        )}

        {/* Botón EDITAR */}
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="w-10 h-10 rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm flex items-center justify-center hover:bg-slate-50 active:scale-95 transition"
            aria-label="Editar opciones"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
