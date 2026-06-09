import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin, useRegister } from '../../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { mutate: login, isPending: loginPending } = useLogin();
  const { mutate: register, isPending: registerPending } = useRegister();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email y contrasena son requeridos');
      return;
    }

    login(
      { email, password },
      {
        onSuccess: () => {
          navigate('/store/home');
        },
        onError: (err: any) => {
          setError(err.response?.data?.message || err.message || 'Credenciales invalidas');
        },
      }
    );
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!nombre || !apellido || !email || !password) {
      setError('Todos los campos son requeridos');
      return;
    }

    register(
      { nombre, apellido, email, password },
      {
        onSuccess: () => {
          setSuccess('Cuenta creada exitosamente. Ahora podes iniciar sesion.');
          setIsRegisterMode(false);
          setNombre('');
          setApellido('');
          setPassword('');
        },
        onError: (err: any) => {
          setError(err.response?.data?.message || err.message || 'Error al registrarse');
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">
            {isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesion'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isRegisterMode ? 'Registrate para hacer pedidos' : 'Ingresa para continuar'}
          </p>
        </div>

        <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {isRegisterMode && (
            <>
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Tu nombre"
                  disabled={registerPending}
                />
              </div>
              <div>
                <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido
                </label>
                <input
                  type="text"
                  id="apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Tu apellido"
                  disabled={registerPending}
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="tu@email.com"
              disabled={loginPending || registerPending}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contrasena
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent pr-12"
                placeholder="********"
                disabled={loginPending || registerPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginPending || registerPending}
            className="w-full bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegisterMode
              ? (registerPending ? 'Registrando...' : 'Crear Cuenta')
              : (loginPending ? 'Iniciando sesion...' : 'Iniciar Sesion')}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError('');
              setSuccess('');
            }}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isRegisterMode
              ? 'Ya tengo cuenta - Iniciar Sesion'
              : 'No tengo cuenta - Registrarme'}
          </button>
        </div>
      </div>
    </div>
  );
}
