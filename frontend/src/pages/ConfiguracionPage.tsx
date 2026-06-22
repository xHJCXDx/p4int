import { useAuth } from "../hooks/useAuth";

export function ConfiguracionPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Configuración
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
          Visualiza y gestiona tu información personal.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Perfil de Usuario
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Nombre
              </label>
              <input
                type="text"
                readOnly
                value={user?.nombre || ""}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg px-4 py-2.5 outline-none opacity-80 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Apellido
              </label>
              <input
                type="text"
                readOnly
                value={user?.apellido || ""}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg px-4 py-2.5 outline-none opacity-80 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                readOnly
                value={user?.email || ""}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg px-4 py-2.5 outline-none opacity-80 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Celular
              </label>
              <input
                type="text"
                readOnly
                value={user?.celular || ""}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg px-4 py-2.5 outline-none opacity-80 cursor-not-allowed"
              />
            </div>

          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            Para modificar estos datos, por favor contacta con un administrador del sistema.
          </div>
        </div>
      </div>
    </div>
  );
}
