import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { AuthProvider } from '@/features/auth';
import { CartProvider } from '@/features/cart';
import '@/styles/globals.css';
import '@/styles/storefront.css';
import '@/styles/admin.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AuthProvider>
  </StrictMode>,
);
