// src/api.js
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Devuelve headers con Authorization si existe token en localStorage.
 */
export function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, ...extra }
    : { ...extra };
}

/**
 * GET
 */
export async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

/**
 * POST
 */
export async function apiPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

/**
 * PUT
 */
export async function apiPut(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

/**
 * DELETE
 */
export async function apiDelete(path) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
