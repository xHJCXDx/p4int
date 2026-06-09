import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';

// Admin pages
import LoginPage from './pages/admin/LoginPage';

// CRUD pages
import CategoriasPage from './pages/CategoriasPage';
import ProductsPage from './pages/ProductsPage';
import IngredientesPageRefactored from './pages/IngredientesPageRefactored';
import PedidosPageRefactored from './pages/PedidosPageRefactored';

// Error pages
const NotFoundPage = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-gray-600 mb-4">Pagina no encontrada</p>
    </div>
  </div>
);

const ForbiddenPage = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
      <p className="text-gray-600 mb-4">No tienes permiso para acceder a este recurso</p>
    </div>
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* CRUD pages */}
      <Route
        path="/categorias"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <CategoriasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/productos"
        element={
          <ProtectedRoute roles={['ADMIN', 'STOCK']}>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ingredientes"
        element={
          <ProtectedRoute roles={['ADMIN', 'STOCK']}>
            <IngredientesPageRefactored />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos"
        element={
          <ProtectedRoute roles={['ADMIN', 'PEDIDOS']}>
            <PedidosPageRefactored />
          </ProtectedRoute>
        }
      />

      {/* Error pages */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/pedidos" replace />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ToastProvider>
        <ConfirmProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <AppRoutes />
          </div>
        </ConfirmProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
