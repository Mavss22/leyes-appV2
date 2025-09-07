// src/modules/results/Results.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "@/api";
import "./Results.css";

export default function Results() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  }, []);
  const isClient = String(user?.rol || user?.role || "").toUpperCase() === "CLIENTE" || Number(user?.role_id) === 3;
  const userCompanyId = user?.company_id || null;

  const fetchList = async () => {
    try {
      setBusy(true);
      setErr("");

      // Preferir filtro server-side si hay company_id
      let data;
      if (isClient && userCompanyId) {
        try {
          data = await apiGet(`/api/evaluaciones?company_id=${encodeURIComponent(userCompanyId)}`);
        } catch (e) {
          // fallback: sin filtro (y filtramos client-side)
          console.warn("GET filtrado falló, uso fallback:", e);
          data = await apiGet(`/api/evaluaciones`);
        }
      } else {
        data = await apiGet(`/api/evaluaciones`);
      }

      let list = Array.isArray(data.items) ? data.items : [];
      if (isClient && userCompanyId) {
        list = list.filter(it => (it.company_id || it.companyId) === userCompanyId);
      }
      setItems(list);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar las evaluaciones.");
      setItems([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const openDetail = (id) => navigate(`/results/${id}`);
  const pct = (it) => (typeof it.pct === "number" ? `${Math.round(it.pct)}%` : "—");
  const levelClass = (lvl) => {
    const v = String(lvl || "").toLowerCase();
    if (v.includes("alto")) return "badge green";
    if (v.includes("medio")) return "badge amber";
    if (v.includes("bajo")) return "badge orange";
    return "badge red";
  };

  return (
    <div className="res-page">
      {/* … (la misma UI de antes) … */}
      {err && (
        <div className="res-alert">
          <strong>Error:</strong> {err}
        </div>
      )}
      {/* tabla, igual que tenías */}
      {/* usa items del estado */}
    </div>
  );
}
