import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './context/AuthContext'
import { initMonitoring } from './lib/monitoring'
import { logEnvValidation } from './lib/envValidator'
import { isAdmin } from './lib/activityLog'
import './index.css'
// App.css was removed — all styles are in index.css

// Validate environment and log warnings for missing configs
logEnvValidation();

// Init Sentry monitoring (reads VITE_SENTRY_DSN) — non-blocking
setTimeout(() => initMonitoring(), 0);

// Force isAdmin into bundle to prevent tree-shaking (used in Navbar + AdminPage)
if (typeof isAdmin === 'function') isAdmin({ uid: 'retain' });

// Restore persisted reduce-motion preference before first paint
try {
  if (localStorage.getItem("ep-reduce-motion") === "1") {
    document.documentElement.classList.add("reduce-motion");
  }
} catch (_) { /* ignore */ }
// Register the service worker (offline shell). Cleanup of stale SWs/caches
// runs at most once per SW_VERSION inside clearOldServiceWorker (App.jsx).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
