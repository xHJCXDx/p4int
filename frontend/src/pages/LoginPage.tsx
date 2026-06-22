import axios from "axios";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

type LockoutNotice = {
  message: string;
  retryAfterSeconds: number | null;
};

function formatWait(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "unos minutos";
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@tienda.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [lockoutNotice, setLockoutNotice] = useState<LockoutNotice | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLockoutNotice(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      const cause = err instanceof Error ? err.cause : undefined;
      if (axios.isAxiosError(cause) && cause.response?.status === 429) {
        const retryAfterRaw = cause.response.headers["retry-after"];
        const retryAfter = Number.parseInt(String(retryAfterRaw ?? ""), 10);
        setLockoutNotice({
          message: "Se bloquearon temporalmente los intentos de ingreso.",
          retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : null,
        });
      }
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl overflow-hidden">
        {/* Imagen arriba del formulario */}
        <div className="bg-white flex items-center justify-center pt-8 px-8">
          <img src="/images/tienda.png" alt="Tienda Logo" className="h-32 w-auto object-contain drop-shadow-md" />
        </div>

        {/* Formulario */}
        <div className="p-8 sm:p-10 pt-6 flex flex-col justify-center">
          <h1 className="text-2xl font-extrabold mb-1 text-gray-800">Iniciar sesion</h1>
          <p className="text-sm text-gray-500 mb-6">Bienvenido de nuevo a Tienda</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg px-4 py-2.5 disabled:opacity-60 transition-colors"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>

      {lockoutNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setLockoutNotice(null)}
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Cerrar aviso de bloqueo"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setLockoutNotice(null)}
              className="absolute right-4 top-4 h-8 w-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              aria-label="Cerrar"
            >
              x
            </button>
            <h2 className="text-xl font-bold text-gray-900">Ingreso bloqueado</h2>
            <p className="mt-3 text-sm text-gray-600">
              {lockoutNotice.message} Espera {formatWait(lockoutNotice.retryAfterSeconds)} antes de volver a intentar.
            </p>
            <button
              type="button"
              onClick={() => setLockoutNotice(null)}
              className="mt-6 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
