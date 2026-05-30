import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './lib/authContext';

// CRITICAL INTEGRATION: Robust global JSON.stringify override to handle circular structures
// and prevent untraced frontend crashes (e.g. within Firestore SDK or third-party wrappers)
const nativeStringify = JSON.stringify;
JSON.stringify = function (value: any, replacer?: any, space?: any): string {
  try {
    return nativeStringify(value, replacer, space);
  } catch (err: any) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('circular')) {
      console.warn('[System Diagnostics Debugger] Circular structure detected in JSON.stringify. Invoking safe fallback.');
      const seen = new WeakSet();
      return nativeStringify(value, function (key, val) {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
          // Omit DOM nodes / HTML elements which are non-serializable and circular
          if (val instanceof HTMLElement || (val.nodeType !== undefined && val.nodeName !== undefined)) {
            return '[HTMLElement]';
          }
        }
        if (typeof replacer === 'function') {
          return replacer(key, val);
        } else if (Array.isArray(replacer)) {
          if (key !== '' && !replacer.includes(key)) {
            return undefined;
          }
        }
        return val;
      }, space);
    }
    throw err;
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
