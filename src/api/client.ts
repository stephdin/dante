// Thin fetch wrapper for the backend API. In dev, Vite proxies /api/* to the
// Deno server (see vite.config.ts), so requests stay same-origin.

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) {
    throw new Error(`GET /api${path} fehlgeschlagen: ${res.status}`);
  }
  return (await res.json()) as T;
}
