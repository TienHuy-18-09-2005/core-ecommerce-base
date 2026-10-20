import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./app/ErrorBoundary.tsx";
import { QueryProvider } from "./app/QueryProvider.tsx";
import { ToastProvider } from "./app/Toast.tsx";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <QueryProvider>
          <App />
        </QueryProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
