/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAINTENANCE_MODE?: string;
  readonly VITE_MAINTENANCE_ALLOW_ADMIN?: string;
  readonly VITE_MAINTENANCE_MESSAGE?: string;
  readonly VITE_MAINTENANCE_ETA?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_CLOUDFLARE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
