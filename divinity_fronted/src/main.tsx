import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { QueryProvider } from './app/providers/QueryProvider';
import { AppRouter } from './app/router/AppRouter';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryProvider>
      <AppRouter />
    </QueryProvider>
  </StrictMode>,
);
