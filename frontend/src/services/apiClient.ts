import axios, { type InternalAxiosRequestConfig } from "axios";
import { mapApiError, resolveApiBaseUrl, shouldAttachCsrf } from "./apiError.ts";

const sanctum = axios.create({
  baseURL: "/",
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

let csrfPromise: Promise<void> | null = null;

export function ensureCsrfCookie(): Promise<void> {
  if (!csrfPromise) {
    csrfPromise = sanctum
      .get("/sanctum/csrf-cookie")
      .then(() => undefined)
      .catch((error: unknown) => {
        csrfPromise = null;
        throw error;
      });
  }

  return csrfPromise;
}

export function resetCsrfCookie(): void {
  csrfPromise = null;
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (shouldAttachCsrf(config.method)) {
    try {
      await ensureCsrfCookie();
    } catch (error: unknown) {
      throw mapApiError(error);
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 419) {
      resetCsrfCookie();
    }

    return Promise.reject(mapApiError(error));
  },
);
