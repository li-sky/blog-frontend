import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// This entry only establishes a local test session; editing runs on /admin.
const EditorEntry = import.meta.env.DEV && import.meta.env.VITE_EDITOR_DEMO === 'true' && window.location.pathname === '/__demo/editor'
  ? React.lazy(() => import('./demo/EditorEntry')) : null;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {EditorEntry ? <React.Suspense fallback={null}><EditorEntry /></React.Suspense> : <App />}
  </React.StrictMode>
);
