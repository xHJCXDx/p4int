import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';

// Store pages
import HomeStorePage from './pages/store/HomeStorePage';
import ProductoDetailPage from './pages/store/ProductoDetailPage';
import CarritoPage from './pages/store/CarritoPage';
import CheckoutPage from './pages/store/CheckoutPage';
import MisPedidosPage from './pages/store/MisPedidosPage';
import ConfiguracionPage from './pages/store/ConfiguracionPage';

// Auth
import LoginPage from './pages/store/LoginPage';

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

      {/* Store routes */}
      <Route path="/store/home" element={<HomeStorePage />} />
      <Route path="/store/producto/:id" element={<ProductoDetailPage />} />
      <Route path="/store/carrito" element={<CarritoPage />} />
      <Route
        path="/store/checkout"
        element={
          <ProtectedRoute roles={['CLIENT']}>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/store/mis-pedidos"
        element={
          <ProtectedRoute roles={['CLIENT']}>
            <MisPedidosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/store/configuracion"
        element={
          <ProtectedRoute roles={['CLIENT']}>
            <ConfiguracionPage />
          </ProtectedRoute>
        }
      />

      {/* Error pages */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/store/home" replace />} />
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
