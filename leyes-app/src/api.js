// src/api.js
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/+$/, "");

function ensureJson(res) {
  // Si el servidor está devolviendo HTML (por ejemplo, index.html), lo detectamos aquí.
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(
      `Respuesta no-JSON del servidor (content-type: ${ct}). ` +
      `Revisa VITE_API_URL: actualmente -> ${API_URL}`
    );
  }
}

export function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  const base = token ? { Authorization: `Bearer ${token}` } : {};
  return { Accept: "application/json", ...base, ...extra };
}

async function parseJson(res) {
  ensureJson(res);
  return await res.json();
}

export async function apiGet(path) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await parseJson(res).catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export async function apiPost(path, body) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res).catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export async function apiPut(path, body) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res).catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export async function apiDelete(path) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, { method: "DELETE", headers: authHeaders() });
  const data = await parseJson(res).catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
