import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./app/ErrorBoundary.tsx";
import { AuthProvider } from "./app/AuthProvider.tsx";
import { QueryProvider } from "./app/QueryProvider.tsx";
import { ToastProvider } from "./app/Toast.tsx";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./pwa/registerSW.ts";

registerServiceWorker();

// React 19 <Seo> quản lý <title>/<meta>; bỏ bản tĩnh trong index.html để không trùng.
document.querySelectorAll("head [data-static-seo]").forEach((el) => el.remove());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <QueryProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
