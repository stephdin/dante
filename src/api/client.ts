// Thin fetch wrapper for the backend API. In dev, Vite proxies /api/* to the
// Deno server (see vite.config.ts), so requests stay same-origin.

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) {
    throw new ApiError(`GET /api${path} fehlgeschlagen: ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(`POST /api${path}`, res.status);
  return res.status === 204 ? (undefined as T) : (await res.json()) as T;
}

export async function apiPut(path: string, body: unknown): Promise<void> {
  const res = await fetch(`/api${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(`PUT /api${path}`, res.status);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`/api${path}`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(`DELETE /api${path}`, res.status);
}
