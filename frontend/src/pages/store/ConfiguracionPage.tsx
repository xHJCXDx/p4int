import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUpdateProfile, useChangePassword } from '../../hooks/useAuth';
import {
  useDirecciones,
  useCreateDireccion,
  useUpdateDireccion,
  useSetAsPrincipal,
} from '../../hooks/useDirecciones';
import { DireccionEntrega } from '../../types/direccion';

type Tab = 'perfil' | 'direcciones' | 'password';

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('perfil');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'perfil', label: 'Mi Perfil' },
    { key: 'direcciones', label: 'Direcciones' },
    { key: 'password', label: 'Contraseña' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Configuracion</h1>

      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-gray-800 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && <PerfilSection />}
      {activeTab === 'direcciones' && <DireccionesSection />}
      {activeTab === 'password' && <PasswordSection />}
    </div>
  );
}

function PerfilSection() {
  const usuario = useAuthStore((state) => state.usuario);
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [apellido, setApellido] = useState(usuario?.apellido || '');
  const [celular, setCelular] = useState(usuario?.celular || '');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');

    updateProfile(
      { nombre, apellido, celular: celular || null },
      {
        onSuccess: () => setMsg('Perfil actualizado correctamente'),
        onError: (err: any) =>
          setError(err.message || 'Error al actualizar perfil'),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {msg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
        <input
          type="text"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={usuario?.email || ''}
          disabled
          className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
        <input
          type="tel"
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          placeholder="Opcional"
        />
      </div>

      <div className="pt-2">
        <p className="text-sm text-gray-500 mb-1">
          Miembro desde: {usuario?.created_at ? new Date(usuario.created_at).toLocaleDateString('es-AR') : '-'}
        </p>
        <p className="text-sm text-gray-500">
          Roles: {usuario?.roles.map((r) => r.nombre).join(', ') || '-'}
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-gray-800 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
      >
        {isPending ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  );
}

function DireccionesSection() {
  const { data: direcciones = [], isLoading } = useDirecciones();
  const { mutate: createDireccion, isPending: creating } = useCreateDireccion();
  const { mutate: updateDireccion, isPending: updating } = useUpdateDireccion();
  const { mutate: setPrincipal } = useSetAsPrincipal();
  const [editing, setEditing] = useState<DireccionEntrega | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    alias: '',
    linea1: '',
    linea2: '',
    ciudad: '',
    provincia: '',
    codigo_postal: '',
  });

  const resetForm = () => {
    setForm({ alias: '', linea1: '', linea2: '', ciudad: '', provincia: '', codigo_postal: '' });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (d: DireccionEntrega) => {
    setEditing(d);
    setForm({
      alias: d.alias,
      linea1: d.linea1,
      linea2: d.linea2 || '',
      ciudad: d.ciudad,
      provincia: d.provincia,
      codigo_postal: d.codigo_postal,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');

    const payload = {
      ...form,
      linea2: form.linea2 || null,
      latitud: null,
      longitud: null,
      es_principal: false,
    };

    if (editing) {
      updateDireccion(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            setMsg('Direccion actualizada');
            resetForm();
          },
          onError: (err: any) => setError(err.message || 'Error al actualizar'),
        }
      );
    } else {
      createDireccion(payload, {
        onSuccess: () => {
          setMsg('Direccion creada');
          resetForm();
        },
        onError: (err: any) => setError(err.message || 'Error al crear'),
      });
    }
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {msg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setEditing(null); }}
          className="bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          Agregar direccion
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold text-gray-900">
            {editing ? 'Editar direccion' : 'Nueva direccion'}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Alias</label>
              <input
                type="text"
                value={form.alias}
                onChange={(e) => setForm({ ...form, alias: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Ej: Casa, Trabajo"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
              <input
                type="text"
                value={form.linea1}
                onChange={(e) => setForm({ ...form, linea1: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Calle y numero"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Depto / Piso (opcional)</label>
              <input
                type="text"
                value={form.linea2}
                onChange={(e) => setForm({ ...form, linea2: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input
                type="text"
                value={form.ciudad}
                onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <input
                type="text"
                value={form.provincia}
                onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codigo postal</label>
              <input
                type="text"
                value={form.codigo_postal}
                onChange={(e) => setForm({ ...form, codigo_postal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating || updating}
              className="bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
            >
              {creating || updating ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-500">Cargando direcciones...</p>
      ) : direcciones.length === 0 ? (
        <p className="text-gray-500">No tenes direcciones guardadas.</p>
      ) : (
        <div className="space-y-3">
          {direcciones.map((d) => (
            <div
              key={d.id}
              className={`bg-white border rounded-lg p-4 flex justify-between items-start ${
                d.es_principal ? 'border-gray-800' : 'border-gray-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{d.alias}</span>
                  {d.es_principal && (
                    <span className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded">
                      Principal
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {d.linea1}
                  {d.linea2 && `, ${d.linea2}`}
                </p>
                <p className="text-sm text-gray-500">
                  {d.ciudad}, {d.provincia} - CP {d.codigo_postal}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {!d.es_principal && (
                  <button
                    onClick={() => setPrincipal(d.id)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors"
                  >
                    Hacer principal
                  </button>
                )}
                <button
                  onClick={() => startEdit(d)}
                  className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PasswordSection() {
  const { mutate: changePassword, isPending } = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    changePassword(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          setMsg('Contraseña actualizada correctamente');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err: any) =>
          setError(err.message || 'Error al cambiar contraseña'),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {msg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-gray-800 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
      >
        {isPending ? 'Cambiando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
