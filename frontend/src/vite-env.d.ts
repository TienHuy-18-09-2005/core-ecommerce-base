/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Public browser path or origin for the API. Never put secrets or the
   * internal Docker hostname in a VITE_ variable.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
