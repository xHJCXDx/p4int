import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useLogout } from '../hooks/useAuth';
import { useCarritoStore } from '../store/useCarritoStore';

const Navbar = () => {
  const navigate = useNavigate();
  const { usuario, isAuthenticated } = useAuthStore();
  const { mutate: logout } = useLogout();
  const carrito = useCarritoStore((state) => state.items);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/store/home');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-gray-800 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold hover:text-gray-100 transition-colors">
          Tienda de Alimentos
        </Link>

        <div className="flex gap-6 items-center">
          <Link
            to="/store/home"
            className="text-white hover:text-gray-100 font-semibold transition-colors"
          >
            Tienda
          </Link>
          <Link
            to="/store/carrito"
            className="text-white hover:text-gray-100 font-semibold transition-colors relative"
          >
            Carrito
            {carrito.length > 0 && (
              <span className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {carrito.length}
              </span>
            )}
          </Link>

          {isAuthenticated && usuario ? (
            <>
              <Link
                to="/store/mis-pedidos"
                className="text-white hover:text-gray-100 font-semibold transition-colors"
              >
                Mis Pedidos
              </Link>

              {/* User dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                >
                  {usuario.nombre}
                  <span className="text-xs">{menuOpen ? '▲' : '▼'}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-900">{usuario.nombre}</p>
                      <p className="text-xs text-gray-500">{usuario.email}</p>
                      <div className="flex gap-1 mt-1">
                        {usuario.roles.map((r) => (
                          <span key={r.codigo} className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            {r.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/store/configuracion"
                        onClick={() => setMenuOpen(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Configuracion
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Cerrar sesion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-white text-gray-800 px-4 py-2 rounded font-semibold hover:bg-gray-100 transition-colors"
            >
              Iniciar sesion
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
