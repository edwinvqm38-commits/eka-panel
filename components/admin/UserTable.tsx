"use client";

type Profile = {
  id: string;
  email: string | null;
  nombre: string | null;
  rol: string | null;
  is_active: boolean;
};

type Props = {
  usuarios: Profile[];
  onChangeRol: (id: string, nuevoRol: string) => void;
  onApprove: (id: string) => void;
  onBlock: (id: string) => void;
  onReactivate: (id: string) => void;
  onSelectUser: (id: string) => void;   // 👈 nuevo
};


const AVAILABLE_ROLES = ["admin", "user", "lector", "pending"] as const;

function getEstadoLabel(u: Profile) {
  if (u.rol === "pending") return "Pendiente";
  if (!u.is_active) return "Bloqueado";
  return "Activo";
}

function getEstadoClass(u: Profile) {
  if (u.rol === "pending")
    return "bg-amber-50 text-amber-700 border border-amber-200";
  if (!u.is_active)
    return "bg-red-50 text-red-700 border border-red-200";
  return "bg-emerald-50 text-emerald-700 border border-emerald-200";
}

export function UserTable({
  usuarios,
  onChangeRol,
  onApprove,
  onBlock,
  onReactivate,
  onSelectUser,
}: Props) {

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <table className="min-w-full text-xs text-slate-700">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide border-b border-slate-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Nombre</th>
            <th className="px-3 py-2 text-left font-semibold">Correo</th>
            <th className="px-3 py-2 text-left font-semibold">Rol</th>
            <th className="px-3 py-2 text-left font-semibold">Estado</th>
            <th className="px-3 py-2 text-left font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u, idx) => {
            const rolActual = u.rol ?? "";
            const estado = getEstadoLabel(u);

            const isPending = u.rol === "pending";
            const isBlocked = !u.is_active && u.rol !== "pending";
            const isActive = u.is_active && u.rol !== "pending";

            return (
              <tr
                key={u.id}
                className={
                  idx % 2 === 0
                    ? "bg-white"
                    : "bg-slate-50/60 border-t border-slate-100"
                }
              >
                <td className="px-3 py-2">
                  {u.nombre || <span className="text-slate-400">—</span>}
                </td>

                <td className="px-3 py-2">
                  {u.email || <span className="text-slate-400">—</span>}
                </td>

                <td className="px-3 py-2">
                  <select
                    value={rolActual}
                    onChange={(e) => onChangeRol(u.id, e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500 focus:ring-[1px] focus:ring-blue-200"
                  >
                    <option value="">sin rol</option>
                    {AVAILABLE_ROLES.map((rol) => (
                      <option key={rol} value={rol}>
                        {rol}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold ${getEstadoClass(
                      u
                    )}`}
                  >
                    {estado}
                  </span>
                </td>

                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onApprove(u.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        ✅ Aprobar
                      </button>
                    )}

                    {isActive && (
                      <button
                        type="button"
                        onClick={() => onBlock(u.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                      >
                        🚫 Bloquear
                      </button>
                    )}

                    {isBlocked && (
                      <button
                        type="button"
                        onClick={() => onReactivate(u.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
                      >
                        🔁 Reactivar
                      </button>
                    )}

                      <button
                        type="button"
                        onClick={() => onSelectUser(u.id)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
                    >
                        ⚙️ Permisos
                    </button>

                    {!isPending && !isActive && !isBlocked && (
                      <span className="text-[11px] text-slate-400">
                        Sin acciones disponibles
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {usuarios.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-4 text-center text-[11px] text-slate-400"
              >
                No hay usuarios registrados aún.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
