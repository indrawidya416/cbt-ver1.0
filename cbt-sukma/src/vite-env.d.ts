/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL Google Apps Script (/exec) — bisa diisi lewat Netlify Environment Variables */
  readonly VITE_API_URL?: string;
  /** Kunci API Google Apps Script */
  readonly VITE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
