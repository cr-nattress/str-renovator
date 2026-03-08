import { ApiError, isPlatformErrorBody } from "./api-error.js";

const BASE_URL = import.meta.env.VITE_API_URL || "";

export async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));

    if (isPlatformErrorBody(body)) {
      throw new ApiError(body as ConstructorParameters<typeof ApiError>[0]);
    }

    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
