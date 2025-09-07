// src/api.js

// En producción usamos mismo origen (cadena vacía). En dev tomamos VITE_API_URL o localhost.
const isProd = import.meta.env.MODE === "production";
export const API_URL = isProd ? "" : (import.meta.env.VITE_API_URL ?? "http://localhost:4000");

/** Headers con Authorization si existe token. Puedes pasar headers extra. */
export function authHeaders(extra = {}) {
  let token = null;
  try { token = localStorage.getItem("token"); } catch {}
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

/* ------------------------------ utils internas ------------------------------ */
async function safeParse(res) {
  // 204 No Content o sin body
  if (res.status === 204) return null;

  // Intentar según content-type
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await res.json();
  }

  // Si no es JSON, devolvemos texto (útil para diagnosticar HTML/errores del proxy)
  const text = await res.text();
  // Si el caller esperaba JSON y el server envió HTML (p.ej. <!doctype>), no revientas el build.
  // Devolvemos un objeto con el texto para que el throw abajo sea legible.
  return { _raw: text };
}

async function apiRequest(method, path, body) {
  const init = {
    method,
    headers: authHeaders(method === "GET" || method === "DELETE" ? {} : { "Content-Type": "application/json" }),
  };
  if (body !== undefined && method !== "GET" && method !== "DELETE") {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, init);

  let data;
  try {
    data = await safeParse(res);
  } catch {
    // Como último recurso
    data = { _raw: "(sin cuerpo / parse falló)" };
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && data.error) ? data.error :
      (data && typeof data === "object" && data.message) ? data.message :
      (typeof data === "string" ? data :
        (data && data._raw ? data._raw.slice(0, 400) : `HTTP ${res.status}`));
    throw new Error(msg);
  }

  return data;
}

/* ---------------------------------- API ---------------------------------- */
export async function apiGet(path) {
  return apiRequest("GET", path);
}

export async function apiPost(path, body) {
  return apiRequest("POST", path, body);
}

export async function apiPut(path, body) {
  return apiRequest("PUT", path, body);
}

export async function apiDelete(path) {
  return apiRequest("DELETE", path);
}
