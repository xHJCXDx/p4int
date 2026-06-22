import { Routes, Route } from 'react-router-dom';

import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { ProductosPage } from './pages/ProductosPage';
import { ProductoDetallePage } from './pages/ProductoDetallePage';
import { CategoriasPage } from './pages/CategoriasPage';
import { IngredientesPage } from './pages/IngredientesPage';
import { ProductoFormPage } from './pages/ProductoFormPage';
import { CategoriaFormPage } from './pages/CategoriaFormPage';
import { IngredienteFormPage } from './pages/IngredienteFormPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { PedidosPage } from './pages/PedidosPage';
import { EstadisticasPage } from './pages/EstadisticasPage';
import { PedidoDetallePage } from './pages/PedidoDetallePage';
import { CarritoPage } from './pages/CarritoPage';
import { MisPedidosPage } from './pages/MisPedidosPage';
import { PagoExitoPage } from './pages/PagoExitoPage';
import { PagoFalloPage } from './pages/PagoFalloPage';
import { PagoPendientePage } from './pages/PagoPendientePage';
import { LoginPage } from './pages/LoginPage';
import { RequireAuth } from './routes/RequireAuth';
import { RequireRole } from './routes/RequireRole';
import { ROLES } from './hooks/useRoles';

import { useProductos } from './hooks/useProducto';
import { useCategorias } from './hooks/useCategoria';
import { useIngredientes } from './hooks/useIngrediente';

export default function App() {
  const { error: errorProd } = useProductos();
  const { error: errorCat } = useCategorias();
  const { error: errorIng } = useIngredientes();

  return (
    <>
      {(errorProd || errorCat || errorIng) && (
        <div className="bg-red-500 text-white p-3 text-center text-sm font-medium z-50 relative shadow-md">
          <p>Error de conexion con el servidor: {errorProd || errorCat || errorIng}</p>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pago/exito" element={<PagoExitoPage />} />
        <Route path="/pago/fallo" element={<PagoFalloPage />} />
        <Route path="/pago/pendiente" element={<PagoPendientePage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="productos/nuevo" element={<ProductoFormPage />} />
            <Route path="productos/:id/editar" element={<ProductoFormPage />} />
            <Route path="productos/:id" element={<ProductoDetallePage />} />
            <Route element={<RequireRole allowed={[ROLES.CLIENT]} />}>
              <Route path="hacer-pedido" element={<ProductosPage />} />
              <Route path="carrito" element={<CarritoPage />} />
              <Route path="mis-pedidos" element={<MisPedidosPage />} />
              <Route path="mis-pedidos/:id" element={<PedidoDetallePage />} />
            </Route>
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="categorias/nueva" element={<CategoriaFormPage />} />
            <Route path="categorias/:id/editar" element={<CategoriaFormPage />} />
            <Route path="ingredientes" element={<IngredientesPage />} />
            <Route path="ingredientes/nuevo" element={<IngredienteFormPage />} />
            <Route path="ingredientes/:id/editar" element={<IngredienteFormPage />} />

            <Route element={<RequireRole allowed={[ROLES.ADMIN]} />}>
              <Route path="usuarios" element={<UsuariosPage />} />
            </Route>

            <Route element={<RequireRole allowed={[ROLES.ADMIN, ROLES.PEDIDOS, ROLES.STOCK]} />}>
              <Route path="pedidos" element={<PedidosPage />} />
              <Route path="pedidos/:id" element={<PedidoDetallePage />} />
            </Route>

            <Route element={<RequireRole allowed={[ROLES.ADMIN, ROLES.PEDIDOS]} />}>
              <Route path="estadisticas" element={<EstadisticasPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}
