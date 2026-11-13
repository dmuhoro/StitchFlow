import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { emit } from './lib/telemetry';
import { installVercelTelemetry } from './lib/telemetry-vercel';
import './index.css';

// Page views are captured on any Vercel plan; custom events need Pro or
// Enterprise. Installing in production only keeps dev and the hermetic suite
// free of a script request that cannot resolve there.
if (import.meta.env.PROD) {
  installVercelTelemetry();
}

// Crashes outside React's tree still need to be visible. The handler passes a
// fixed enum only: the error object, its message, and the stack never leave the
// browser.
window.addEventListener('error', () => emit('app_error', { error_kind: 'window' }));
window.addEventListener('unhandledrejection', () =>
  emit('app_error', { error_kind: 'promise' }),
);

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
