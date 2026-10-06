export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

// Evita open redirects: sólo rutas internas absolutas ("/..."), nunca
// "//host", "/\host" ni esquemas como "javascript:".
export function getSafeRedirectPath(value: unknown, fallback: string = DEFAULT_AUTHENTICATED_PATH): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
