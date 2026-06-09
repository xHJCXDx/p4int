import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useLogout } from '../hooks/useAuth';

const Navbar = () => {
  const navigate = useNavigate();
  const { usuario, isAuthenticated } = useAuthStore();
  const { mutate: logout } = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
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
          Admin - Tienda
        </Link>

        <div className="flex gap-6 items-center">
          {isAuthenticated && usuario ? (
            <>
              {(() => {
                const isAdmin = usuario.roles.some((r) => r.codigo === 'ADMIN');
                const isStock = usuario.roles.some((r) => r.codigo === 'STOCK');
                const isPedidos = usuario.roles.some((r) => r.codigo === 'PEDIDOS');

                return (
                  <>
                    {isAdmin && (
                      <Link to="/categorias" className="text-white hover:text-gray-100 font-semibold transition-colors">
                        Categorias
                      </Link>
                    )}
                    {(isAdmin || isStock) && (
                      <Link to="/productos" className="text-white hover:text-gray-100 font-semibold transition-colors">
                        Productos
                      </Link>
                    )}
                    {(isAdmin || isStock) && (
                      <Link to="/ingredientes" className="text-white hover:text-gray-100 font-semibold transition-colors">
                        Ingredientes
                      </Link>
                    )}
                    {(isAdmin || isPedidos) && (
                      <Link to="/pedidos" className="text-white hover:text-gray-100 font-semibold transition-colors">
                        Pedidos
                      </Link>
                    )}
                  </>
                );
              })()}

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
