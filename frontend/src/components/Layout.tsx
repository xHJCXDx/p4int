import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../hooks/useAuth";
import { useCarrito } from "../hooks/useCarrito";
import { fetchPedidos } from "../api/pedidosApi";
import type { Pedido } from "../models/Pedido";
import { usePermissions } from "../hooks/useRoles";
import {
  countUnreadClientPedidoUpdates,
  countUnreadOperatorPedidos,
  syncClientPedidoStatuses,
  syncSeenPedidos,
} from "../api/pedidosUnread";
import { useOrderStatusWS } from "../hooks/useOrderStatusWS";

type ThemeMode = "light" | "dark";
type NavLink = {
  name: string;
  path: string;
  badge?: number;
};

const THEME_KEY = "panel-theme-mode";
const FETCH_LIMIT = 100;

async function fetchAllPedidos(): Promise<Pedido[]> {
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const all: Pedido[] = [];

  while (offset < total) {
    const response = await fetchPedidos({ offset, limit: FETCH_LIMIT });
    total = response.total ?? all.length;
    all.push(...(response.items ?? []));
    if (!response.items?.length) break;
    offset += FETCH_LIMIT;
  }

  return all;
}

function readSavedTheme(): ThemeMode {
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === "dark" ? "dark" : "light";
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7.2 7.2 0 1 0 9.8 9.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <path
        d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.47 1.18h7.86a1.5 1.5 0 0 0 1.47-1.18L20.5 8H6.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => readSavedTheme());

  const location = useLocation();
  const profileRef = useRef<HTMLDivElement | null>(null);
  const { token, user, logout } = useAuth();
  const userId = user?.id;
  const { canViewPedidos, canUseCarrito, isClient, isStock, isPedidos, isAdmin, roleLabel } = usePermissions();
  const { totalItems } = useCarrito();
  const wsStatus = useOrderStatusWS(Boolean(userId), token);

  const profileImgUrl = user ? "/profiles/avatar.jpg" : undefined;

  const { data: pedidosOperador = [] } = useQuery({
    queryKey: ["pedidos", "all", "navbar"],
    queryFn: fetchAllPedidos,
    enabled: canViewPedidos,
    refetchInterval: 30000,
  });
  const { data: pedidosCliente = [] } = useQuery({
    queryKey: ["mis-pedidos", "navbar"],
    queryFn: fetchAllPedidos,
    enabled: canUseCarrito,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!isProfileOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setIsProfileOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsProfileOpen(false);
    };
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isProfileOpen]);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!canViewPedidos || !userId) return;
    syncSeenPedidos(userId, pedidosOperador);
  }, [canViewPedidos, pedidosOperador, userId]);

  useEffect(() => {
    if (!canUseCarrito || !userId) return;
    syncClientPedidoStatuses(userId, pedidosCliente);
  }, [canUseCarrito, pedidosCliente, userId]);

  const unreadPedidos = useMemo(() => {
    if (!canViewPedidos || !userId) return 0;
    return countUnreadOperatorPedidos(userId, pedidosOperador);
  }, [canViewPedidos, pedidosOperador, userId]);

  const unreadMisPedidos = useMemo(() => {
    if (!canUseCarrito || !userId) return 0;
    return countUnreadClientPedidoUpdates(userId, pedidosCliente);
  }, [canUseCarrito, pedidosCliente, userId]);

  // Enlaces de navegacion segun el rol del usuario (encabezado distinto por rol).
  const catalogoLinks: NavLink[] = [
    { name: "Productos", path: "/productos" },
    { name: "Categorias", path: "/categorias" },
    { name: "Ingredientes", path: "/ingredientes" },
  ];
  let navLinks: NavLink[] = [];
  if (isClient) {
    navLinks = [
      { name: "Comprar", path: "/productos" },
      { name: "Pedidos", path: "/mis-pedidos", badge: unreadMisPedidos },
    ];
  } else if (isStock) {
    navLinks = catalogoLinks;
  } else if (isPedidos) {
    navLinks = [
      { name: "Pedidos", path: "/pedidos", badge: unreadPedidos },
      { name: "Estadisticas", path: "/estadisticas" },
    ];
  } else if (isAdmin) {
    navLinks = [
      ...catalogoLinks,
      { name: "Pedidos", path: "/pedidos", badge: unreadPedidos },
      { name: "Estadisticas", path: "/estadisticas" },
      { name: "Usuarios", path: "/usuarios" },
    ];
  }

  // El carrito del cliente lleva al carrito; para el personal deriva a la gestion de pedidos.
  const cartTo = canUseCarrito ? "/carrito" : "/pedidos";
  const cartBadge = canUseCarrito ? totalItems : unreadPedidos;
  const showCart = canUseCarrito || canViewPedidos;

  const linkClass = (active: boolean) =>
    `px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
      active
        ? "text-white bg-gray-700/60 dark:bg-slate-700/50"
        : "text-gray-300 hover:text-white hover:bg-gray-700/40 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70"
    }`;

  const Badge = ({ value }: { value?: number }) =>
    !value ? null : (
      <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-bold px-1.5">
        {value}
      </span>
    );

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 dark:text-slate-100 transition-colors">
      <nav className="bg-gray-800 dark:bg-slate-950/85 dark:backdrop-blur-xl shadow-sm border-b border-gray-700 dark:border-slate-700/70 sticky top-0 z-50 transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            {/* Marca */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-2" onClick={closeMenu}>
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                Tienda
              </span>
            </Link>

            {/* Navegacion (desktop) */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} className={linkClass(isActive(link.path))}>
                  <span className="inline-flex items-center gap-2">
                    {link.name}
                    <Badge value={link.badge} />
                  </span>
                </Link>
              ))}
            </div>

            {/* Acciones (desktop) */}
            <div className="hidden md:flex items-center gap-2 ml-auto">
              {showCart && (
                <Link
                  to={cartTo}
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-300 hover:text-white hover:bg-gray-700/40 dark:hover:bg-slate-800 transition-colors"
                  aria-label={canUseCarrito ? "Ver carrito" : "Gestion de pedidos"}
                  title={canUseCarrito ? "Carrito" : "Pedidos"}
                >
                  <CartIcon />
                  {!!cartBadge && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                      {cartBadge}
                    </span>
                  )}
                </Link>
              )}

              {/* Menu de perfil */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className="flex items-center rounded-full ring-2 ring-transparent hover:ring-gray-500 dark:hover:ring-slate-600 transition-all focus:outline-none focus:ring-gray-400"
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                  aria-label="Abrir menu de usuario"
                >
                  {profileImgUrl ? (
                    <img
                      src={profileImgUrl}
                      alt="Perfil"
                      className="w-9 h-9 rounded-full object-cover bg-slate-200"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold bg-gray-600">
                      {(user?.nombre || user?.email || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{user?.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
                      {roleLabel && (
                        <span className="mt-1.5 inline-flex text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/60 px-2 py-0.5 rounded-md">
                          {roleLabel}
                        </span>
                      )}
                    </div>
                    <ul className="py-1">
                      <li>
                        <Link
                          to="/configuracion"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></circle>
                          </svg>
                          Configuración
                        </Link>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => { toggleTheme(); }}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span className="inline-flex items-center gap-2">
                            {theme === "light" ? <MoonIcon /> : <SunIcon />}
                            Modo oscuro
                          </span>
                          <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${theme === "dark" ? "bg-blue-600" : "bg-gray-300 dark:bg-slate-600"}`}>
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${theme === "dark" ? "translate-x-4" : "translate-x-1"}`} />
                          </div>
                        </button>
                      </li>
                      <li className="border-t border-gray-100 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => { setIsProfileOpen(false); logout(); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                            <path d="M15 12H3m0 0l4-4m-4 4l4 4M21 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Salir
                        </button>
                      </li>
                    </ul>
                    {userId && (
                      <div className="px-4 py-2 text-[11px] text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-700">
                        {wsStatus === "connected" ? "Conexion en tiempo real activa" : "Sin conexion en tiempo real"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Acciones (mobile) */}
            <div className="flex items-center md:hidden gap-1 ml-auto">
              {showCart && (
                <Link
                  to={cartTo}
                  onClick={closeMenu}
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-300 hover:text-white transition-colors"
                  aria-label={canUseCarrito ? "Ver carrito" : "Gestion de pedidos"}
                >
                  <CartIcon />
                  {!!cartBadge && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                      {cartBadge}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/40 dark:text-slate-300 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500 transition-colors"
                aria-expanded={isMenuOpen}
              >
                <span className="sr-only">Abrir menu principal</span>
                {!isMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Panel mobile */}
        {isMenuOpen && (
          <div className="md:hidden bg-gray-800 dark:bg-slate-950/95 dark:backdrop-blur-lg border-t border-gray-700 dark:border-slate-700 shadow-inner transition-colors">
            <div className="px-4 pt-3 pb-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={closeMenu}
                  className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    isActive(link.path)
                      ? "bg-gray-700/60 text-white dark:bg-slate-700/50"
                      : "text-gray-300 hover:text-white hover:bg-gray-700/40 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {link.name}
                    <Badge value={link.badge} />
                  </span>
                </Link>
              ))}
              <div className="pt-3 px-1 space-y-2 border-t border-gray-700 dark:border-slate-700 mt-2">
                <div className="flex items-center gap-3">
                  {profileImgUrl && (
                    <img src={profileImgUrl} alt="Perfil" className="w-9 h-9 rounded-full object-cover bg-slate-200" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white dark:text-slate-100 truncate">{user?.nombre}</div>
                    <div className="text-xs text-gray-400 dark:text-slate-400 truncate">{user?.email}</div>
                  </div>
                </div>
                <ul className="space-y-2 mt-3">
                  <li>
                    <Link
                      to="/configuracion"
                      onClick={closeMenu}
                      className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-300 dark:text-slate-200 hover:text-white bg-gray-700/50 dark:bg-slate-800 hover:bg-gray-700 dark:hover:bg-slate-700"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></circle>
                      </svg>
                      Configuración
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-full inline-flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-gray-300 dark:text-slate-200 hover:text-white bg-gray-700/50 dark:bg-slate-800 hover:bg-gray-700 dark:hover:bg-slate-700"
                    >
                      <span className="inline-flex items-center gap-2">
                        {theme === "light" ? <MoonIcon /> : <SunIcon />}
                        Modo oscuro
                      </span>
                      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${theme === "dark" ? "bg-blue-500" : "bg-gray-600"}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${theme === "dark" ? "translate-x-4" : "translate-x-1"}`} />
                      </div>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => { logout(); closeMenu(); }}
                      className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-red-500 hover:text-red-400 bg-red-900/20 border border-red-800/30 hover:bg-red-900/40"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                        <path d="M15 12H3m0 0l4-4m-4 4l4 4M21 4v16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Salir
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      <footer className="mt-auto text-slate-300 bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="lg:pr-8">
              <h3 className="text-2xl font-extrabold text-blue-400 mb-3">Tienda</h3>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Empresa</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="cursor-default">Sobre nosotros</li>
                <li className="cursor-default">Catalogo</li>
                <li className="cursor-default">Sucursales</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Atencion al cliente</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="cursor-default">Centro de ayuda</li>
                <li className="cursor-default">Politica de privacidad</li>
                <li className="cursor-default">Devoluciones</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Tienda. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
