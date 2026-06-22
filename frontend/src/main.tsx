import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

import { ProductosProvider } from './context/ProductoContext.tsx';
import { CategoriasProvider } from './context/CategoriaContext.tsx';
import { IngredientesProvider } from './context/IngredienteContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { CarritoProvider } from './context/CarritoContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { queryClient } from './api/queryClient.ts';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <CarritoProvider>
              <ProductosProvider>
                <CategoriasProvider>
                  <IngredientesProvider>
                    <App />
                  </IngredientesProvider>
                </CategoriasProvider>
              </ProductosProvider>
            </CarritoProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
