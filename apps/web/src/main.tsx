import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { AppI18nProvider } from '@/app/AppI18nProvider';
import { AuthProvider } from '@/features/auth';
import { CartProvider } from '@/features/cart';
import '@/styles/globals.css';
import '@/styles/storefront.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <AppI18nProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AppI18nProvider>
    </AuthProvider>
  </StrictMode>,
);
