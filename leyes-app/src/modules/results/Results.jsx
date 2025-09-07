// src/modules/results/Results.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Results.css";
import { apiGet } from "@/api";             // ⬅️ usamos el helper ya creado
import { authHeaders } from "../../utils/authHeader"; // (solo para export CSV si lo necesitas luego)

export default function Results() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  // user actual (para filtrar por empresa si es cliente)
  let user = null;
  try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch {}

  const buildUrl = () => {
    // Si es cliente (role_id = 3) y tiene company_id => solo sus evaluaciones
    const roleId = Number(user?.role_id);
    const companyId = user?.company_id;
    if (roleId === 3 && companyId) {
      return `/api/evaluaciones?company_id=${encodeURIComponent(companyId)}`;
    }
    // Admin / auditor (o sin company_id): lista completa (según permisos del backend)
    return `/api/evaluaciones`;
  };

  const fetchList = async () => {
    setBusy(true);
    setErr("");
    try {
      const url = buildUrl();
      const data = await apiGet(url); // ⬅️ valida Content-Type y lanza error si no es JSON
      // backend puede devolver {items: [...] } o directamente []
      const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setItems(list);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar las evaluaciones.");
      setItems([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = (id) => navigate(`/results/${id}`);

  const pct = (it) => (typeof it.pct === "number" ? `${Math.round(it.pct)}%` :
                       typeof it.cumplimiento === "number" ? `${Math.round(it.cumplimiento)}%` : "—");

  const levelClass = (lvl) => {
    const v = String(lvl || "").toLowerCase();
    if (v.includes("alto")) return "badge green";
    if (v.includes("medio")) return "badge amber";
    if (v.includes("bajo")) return "badge orange";
    return "badge red";
  };

  return (
    <div className="res-page">
      {/* Cabecera visual */}
      <section className="res-hero">
        <div className="res-hero-inner">
          <span className="res-pill">Panel</span>
          <h1 className="res-title">Resultados</h1>
          <p className="res-sub">Visualiza los resultados de tus evaluaciones aquí.</p>
        </div>
      </section>

      <main className="res-main">
        {err && (
          <div className="res-alert">
            <strong>Error:</strong> {err}
          </div>
        )}

        <div className="res-card">
          <div className="res-card-head">
            <h3>Evaluaciones</h3>
            <button className="btn-primary" onClick={fetchList} disabled={busy}>
              {busy ? "Actualizando…" : "Actualizar"}
            </button>
          </div>

          <div className="res-table-wrap">
            <table className="res-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empresa</th>
                  <th>Normativa</th>
                  <th>%</th>
                  <th>Nivel</th>
                  <th>Vence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="res-empty">
                      {busy ? "Cargando…" : "Sin evaluaciones"}
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id}>
                      <td className="res-date">
                        <div>{it.started_at ? new Date(it.started_at).toLocaleDateString() : "—"}</div>
                        <small>{it.started_at ? new Date(it.started_at).toLocaleTimeString() : ""}</small>
                      </td>
                      <td>{it.company_name || "—"}</td>
                      <td>{it.normativa || "—"}</td>
                      <td>{pct(it)}</td>
                      <td>
                        <span className={levelClass(it.level || it.nivel)}>
                          {it.level || it.nivel || "—"}
                        </span>
                      </td>
                      <td className="res-date">
                        <div>{it.due_at ? new Date(it.due_at).toLocaleDateString() : "—"}</div>
                        <small>{it.due_at ? new Date(it.due_at).toLocaleTimeString() : ""}</small>
                      </td>
                      <td className="res-actions">
                        <button className="btn-secondary" onClick={() => openDetail(it.id)}>
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
