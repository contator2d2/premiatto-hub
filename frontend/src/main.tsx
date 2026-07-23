import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/auth-context';
import { BrandingProvider } from './contexts/branding-context';
import App from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <BrandingProvider>
          <AuthProvider>
            <App />
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </BrandingProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
