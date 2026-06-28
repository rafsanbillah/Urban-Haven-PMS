import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global secure interceptor for window.fetch to seamlessly attach session authorization
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    writable: true,
    value: async function (input: RequestInfo | URL, init?: RequestInit) {
      const token = localStorage.getItem("pms_token");
      let isApiCall = false;

      if (typeof input === "string") {
        isApiCall = input.startsWith("/api/") || input.includes("/api/");
      } else if (input instanceof URL) {
        isApiCall = input.pathname.startsWith("/api/");
      } else if (input && typeof input === "object" && "url" in input) {
        const urlStr = typeof (input as any).url === "string" ? (input as any).url : String((input as any).url);
        isApiCall = urlStr.includes("/api/");
      }

      if (token && isApiCall) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        init.headers = headers;

        // If the input is a Request object, we create a new Request to apply the headers
        if (input && typeof input === "object" && "url" in input && !("pathname" in input)) {
          try {
            const newReq = new Request(input as Request, {
              headers: headers
            });
            return originalFetch(newReq, init);
          } catch (e) {
            // fallback if Request constructor fails
          }
        }
      }
      return originalFetch(input, init);
    }
  });
} catch (err) {
  console.error("Failed to intercept window.fetch using Object.defineProperty", err);
  try {
    (window as any).fetch = async function (input: any, init: any) {
      const token = localStorage.getItem("pms_token");
      if (token && typeof input === "string" && input.startsWith("/api/")) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        init.headers = headers;
      }
      return originalFetch(input, init);
    };
  } catch (e) {
    console.error("Global fetch override fallback failed", e);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

