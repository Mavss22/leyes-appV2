// src/modules/results/ResultDetail.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate, useParams } from "react-router-dom";
import { authHeader } from "../../utils/authHeader";

//const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const isProd = import.meta.env.MODE === "production";
// 🔒 En producción SIEMPRE mismo origen; en dev usa VITE_API_URL o localhost
const API = isProd ? "" : (import.meta.env.VITE_API_URL ?? "http://localhost:4000");

export default function ResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // cabecera evaluación
  const [ev, setEv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // metadatos de preguntas
  const [controles, setControles] = useState([]);

  // estados por control
  const [answers, setAnswers] = useState({});
  const [comments, setComments] = useState({});

  // evidencias por control
  const [evidencias, setEvidencias] = useState({});

  const resultRef = useRef();

  const colorNivel = (pct) =>
    pct >= 80 ? "#2e7d32" : pct >= 60 ? "#f9a825" : pct >= 40 ? "#ef6c00" : "#c62828";

  /* ---------------------- carga evaluación + controles ---------------------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const h = authHeader() || {};
        // detalle evaluación
        const r = await fetch(`${API}/api/evaluaciones/${id}`, { headers: { ...h } });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status} ${t}`);
        }
        const data = await r.json();
        setEv(data);

        // respuestas iniciales
        const a = {};
        const c = {};
        (data.respuestas || []).forEach((row) => {
          a[row.control_clave || row.clave] = row.valor || "";
          c[row.control_clave || row.clave] = row.comentario || "";
        });
        setAnswers(a);
        setComments(c);

        // metadatos de controles
        if (data.normativa) {
          const rr = await fetch(`${API}/api/controles/${data.normativa}`, {
            headers: { ...h },
          });
          const list = (await rr.json()) || [];
          setControles(Array.isArray(list) ? list : []);
        }

        // inicial evidencias
        const evd = {};
        (data.respuestas || []).forEach((row) => {
          const k = row.control_clave || row.clave;
          evd[k] = { filesToSend: [], uploaded: [], uploading: false, err: "" };
        });
        setEvidencias(evd);
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar el detalle de la evaluación.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const controlesByKey = useMemo(() => {
    const m = new Map();
    controles.forEach((c) => m.set(c.clave, c));
    return m;
  }, [controles]);

  const fmtNivel = (pct) => (pct >= 80 ? "Alto" : pct >= 60 ? "Medio" : pct >= 40 ? "Bajo" : "Crítico");

  const pct = ev?.cumplimiento ?? ev?.pct ?? 0;
  const nivel = ev?.nivel || fmtNivel(pct);

  /* ----------------------------- helpers ----------------------------- */
  // Intenta construir “Art. 1 — Subject-matter and objectives”
  const getArticleLabel = (meta) => {
    if (!meta) return "-";
    const code =
      meta.articulo_code ||
      meta.art_code ||
      meta.code ||
      meta.articulo || // a veces el backend pone aquí el código
      null;

    const title =
      meta.articulo_titulo ||
      meta.art_title ||
      meta.title ||
      (meta.articulo && !code ? meta.articulo : null); // fallback si “articulo” realmente era el título

    if (code && title) return `${code} — ${title}`;
    if (code) return `${code}`;
    if (title) return `${title}`;
    return "-";
  };

  /* ----------------------------- handlers UI ----------------------------- */
  const setAnswer = (clave, value) => setAnswers((p) => ({ ...p, [clave]: value }));
  const setComment = (clave, value) => setComments((p) => ({ ...p, [clave]: value }));
  const showEvidenceBlock = (val) => val === "true" || val === "partial";

  const onPickFiles = (clave, fileList) => {
    const files = Array.from(fileList || []);
    setEvidencias((prev) => ({
      ...prev,
      [clave]: { ...(prev[clave] || {}), filesToSend: files, err: "" },
    }));
  };

  const uploadEvidence = async (clave) => {
    try {
      setEvidencias((prev) => ({
        ...prev,
        [clave]: { ...(prev[clave] || {}), uploading: true, err: "" },
      }));

      const item = evidencias[clave] || { filesToSend: [] };
      if (!item.filesToSend.length) {
        setEvidencias((prev) => ({
          ...prev,
          [clave]: { ...(prev[clave] || {}), uploading: false, err: "Selecciona archivo(s) primero." },
        }));
        return;
      }

      const fd = new FormData();
      fd.append("normativa", String(ev?.normativa || "").toUpperCase());
      fd.append("clave", clave);
      item.filesToSend.forEach((f) => fd.append("files", f));

      const h = authHeader() || {};
      const r = await fetch(`${API}/api/evidencias`, {
        method: "POST",
        headers: { ...h },
        body: fd,
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status} ${t}`);
      }
      const data = await r.json();
      setEvidencias((prev) => ({
        ...prev,
        [clave]: {
          filesToSend: [],
          uploaded: data.files || [],
          uploading: false,
          err: "",
        },
      }));
      alert("Evidencia subida correctamente.");
    } catch (e) {
      console.error("uploadEvidence", e);
      setEvidencias((prev) => ({
        ...prev,
        [clave]: { ...(prev[clave] || {}), uploading: false, err: "Error subiendo evidencias." },
      }));
    }
  };

  const saveControl = async (clave) => {
    try {
      const h = authHeader() || {};
      const r = await fetch(`${API}/api/evaluaciones/${id}/respuestas/${encodeURIComponent(clave)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...h },
        body: JSON.stringify({
          valor: answers[clave] || "",
          comentario: (comments[clave] || "").trim(),
        }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || "No se pudo guardar");
      }
      const data = await r.json();
      setEv((prev) =>
        prev
          ? {
              ...prev,
              cumplimiento: data.cumplimiento ?? data.pct ?? prev.cumplimiento,
              nivel: data.nivel ?? prev.nivel,
            }
          : prev
      );
      alert("Guardado.");
    } catch (e) {
      console.error("saveControl", e);
      alert("No se pudo guardar.");
    }
  };

  /* ------------------------------ PDF PRO ------------------------------ */
  const downloadReportPdf = () => {
    if (!ev) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = margin;

    // colores
    const ACCENT = [91, 107, 255];
    const fecha = new Date().toISOString().slice(0, 10);
    const empresa = ev.company_name || "-";
    const normativa = ev.normativa || "-";
    const started = ev.started_at ? new Date(ev.started_at).toLocaleString() : "-";
    const due = ev.due_at ? new Date(ev.due_at).toLocaleString() : "-";

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text(`Informe de evaluación — ${normativa}`, margin, y);
    y += 26;

    doc.setDrawColor(...ACCENT);
    doc.setFillColor(...ACCENT);
    doc.rect(margin, y, doc.internal.pageSize.getWidth() - margin * 2, 2, "F");
    y += 18;

    // Cabecera breve
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Empresa: ${empresa}`, margin, y); y += 16;
    doc.text(`Fecha: ${fecha}`, margin, y); y += 20;

    // Introducción
    const intro =
      `Estimada empresa ${empresa},\n\n` +
      `Se ha llevado a cabo el análisis de la evaluación del cumplimiento de la normativa ${normativa} ` +
      `(Reglamento General de Protección de Datos), con el objetivo de determinar el nivel de madurez ` +
      `de la organización en materia de protección de datos personales y la libre circulación de los mismos ` +
      `dentro de la Unión Europea.\n\n` +
      `A continuación, se presenta un resumen de los hallazgos identificados durante la auditoría, junto con ` +
      `comentarios específicos sobre el nivel de implementación de los controles requeridos y las áreas que ` +
      `requieren mejora para alcanzar un cumplimiento integral y consistente.`;

    const introLines = doc.splitTextToSize(intro, doc.internal.pageSize.getWidth() - margin * 2);
    doc.text(introLines, margin, y);
    y += introLines.length * 14 + 10;

    // Resumen
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Resumen", margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const resumen = [
      `Cumplimiento: ${Math.round(pct)}%`,
      `Nivel: ${nivel}`,
      `Inicio: ${started}`,
      `Vence: ${due}`,
      `Estado: ${ev.status || "open"}`,
    ];
    resumen.forEach((line) => { doc.text(line, margin, y); y += 14; });
    y += 6;

    // Incumplimientos
    const incumplimientos = [];
    (ev.respuestas || []).forEach((row) => {
      const clave = row.control_clave || row.clave;
      const v = answers[clave] || row.valor || "";
      if (v !== "true") {
        const meta = controlesByKey.get(clave) || {};
        const recomendacion = v === "partial" ? "Revisar y completar este control." : "Implementar este control.";
        incumplimientos.push({
          control: meta.pregunta || `Control ${clave}`,
          articulo: getArticleLabel(meta),
          recomendacion,
        });
      }
    });

    if (incumplimientos.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Controles no cumplidos", margin, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["Control", "Artículo", "Recomendación"]],
        body: incumplimientos.map((i) => [i.control, i.articulo, i.recomendacion]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: ACCENT, textColor: 255, fontStyle: "bold" },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 258 }, // control
          1: { cellWidth: 133 }, // artículo (más angosto)
          2: { cellWidth: 100 }, // recomendación
        },
      });
      y = doc.lastAutoTable.finalY + 16;
    }

    // Tabla de respuestas
    const tableRows = (ev.respuestas || []).map((row, idx) => {
      const clave = row.control_clave || row.clave;
      const meta = controlesByKey.get(clave) || {};
      const v = (answers[clave] || row.valor || "")
        .replace("true", "Sí")
        .replace("partial", "Parcial")
        .replace("false", "No");
      const comentario = (comments[clave] || row.comentario || "").trim();
      return [
        meta.pregunta || `Control ${idx + 1}`,
        getArticleLabel(meta),
        v || "-",
        comentario || "-",
      ];
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Detalle de respuestas", margin, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [["Control", "Artículo", "Respuesta", "Comentario"]],
      body: tableRows,
      styles: { fontSize: 9, cellPadding: 5, valign: "top" },
      headStyles: { fillColor: [240, 240, 240], textColor: 33, fontStyle: "bold" },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 180 }, // control
        1: { cellWidth: 100 }, // artículo (código + título)
        2: { cellWidth: 70 },  // respuesta
        3: { cellWidth: 140 }, // comentario
      },
      didDrawPage: (data) => {
        const str = `Generado el ${fecha} — Leyes-App`;
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 12);
      },
    });

    const safe = (s) => String(s || "").replace(/[^\w\-]+/g, "_");
    doc.save(`Informe_${safe(normativa)}_${fecha}.pdf`);
  };

  if (loading) return <div className="page-container"><p>Cargando…</p></div>;
  if (err) return <div className="page-container"><p style={{ color: "#c62828" }}>{err}</p></div>;
  if (!ev) return null;

  return (
    <div className="page-container" style={{ paddingTop: 18 }}>
      {/* encabezado */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Evaluación — {ev.normativa}</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={() => navigate(-1)}>Volver</button>
          <button className="btn-primary" onClick={downloadReportPdf}>Descargar PDF</button>
        </div>
      </div>

      {/* layout responsive: sidebar izquierda + contenido */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* Sidebar */}
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div className="g-card" style={{ padding: 14 }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#1565c0" }}>Resultado</h3>
            <p><strong>Empresa:</strong> {ev.company_name || "-"}</p>
            <p><strong>Cumplimiento:</strong> {Math.round(pct)}%</p>
            <p>
              <strong>Nivel:</strong>{" "}
              <span
                style={{
                  backgroundColor: colorNivel(pct),
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                {nivel}
              </span>
            </p>
          </div>

          <div className="g-card" style={{ padding: 14 }}>
            <p><strong>Normativa:</strong> {ev.normativa}</p>
            <p><strong>Estado:</strong> {ev.status || "open"} <small>(editable)</small></p>
            {ev.started_at && (
              <p style={{ marginTop: 8 }}>
                <small>
                  <strong>Fecha inicio:</strong>{" "}
                  {new Date(ev.started_at).toLocaleString()}
                </small>
                <br />
                <small>
                  <strong>Fecha límite:</strong>{" "}
                  {ev.due_at ? new Date(ev.due_at).toLocaleString() : "-"}
                </small>
              </p>
            )}
          </div>
        </div>

        {/* Contenido (respuestas + evidencias) */}
        <div ref={resultRef}>
          <h3 style={{ marginTop: 0 }}>Respuestas</h3>

          <div style={{ display: "grid", gap: 14 }}>
            {(ev.respuestas || []).map((row, idx) => {
              const clave = row.control_clave || row.clave;
              const val = answers[clave] || "";
              const ctrl = controlesByKey.get(clave) || {};
              const evd = evidencias[clave] || { filesToSend: [], uploaded: [], uploading: false, err: "" };

              return (
                <div key={clave || idx} className="g-card" style={{ padding: 12 }}>
                  {/* título */}
                  <div style={{ marginBottom: 8, fontWeight: 600 }}>
                    {ctrl.pregunta ? ctrl.pregunta : `Control ${clave}`}
                    {getArticleLabel(ctrl) !== "-" && (
                      <span style={{ opacity: 0.7, fontWeight: 400 }}>
                        {" "}
                        <em>({getArticleLabel(ctrl)})</em>
                      </span>
                    )}
                  </div>

                  {/* botones */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => setAnswer(clave, "true")}
                      style={{
                        background: val === "true" ? "#4caf50" : "#eee",
                        color: val === "true" ? "#fff" : "#111",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      ✔️ Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswer(clave, "partial")}
                      style={{
                        background: val === "partial" ? "#ffc107" : "#eee",
                        color: "#111",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      ⚠️ Parcial
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswer(clave, "false")}
                      style={{
                        background: val === "false" ? "#f44336" : "#eee",
                        color: val === "false" ? "#fff" : "#111",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      ❌ No
                    </button>
                  </div>

                  {/* comentario */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", marginBottom: 4 }}>Comentario</label>
                    <textarea
                      rows={2}
                      style={{ width: "100%", padding: 8 }}
                      value={comments[clave] || ""}
                      onChange={(e) => setComment(clave, e.target.value)}
                    />
                  </div>

                  {/* evidencias */}
                  {(val === "true" || val === "partial") && (
                    <div
                      style={{
                        margin: "10px 0",
                        background: "#f5f8ff",
                        border: "1px dashed #90caf9",
                        padding: 12,
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={(e) => onPickFiles(clave, e.target.files)}
                        />
                        <button
                          type="button"
                          onClick={() => uploadEvidence(clave)}
                          disabled={evd.uploading || !(evd.filesToSend?.length)}
                          className="btn-secondary"
                          style={{ padding: "6px 10px" }}
                        >
                          {evd.uploading ? "Subiendo…" : "Subir evidencia"}
                        </button>
                        {evd.err && <span style={{ color: "#c62828" }}>{evd.err}</span>}
                      </div>

                      {evd.filesToSend?.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <small>
                            <strong>Seleccionados:</strong> {evd.filesToSend.map((f) => f.name).join(", ")}
                          </small>
                        </div>
                      )}

                      {evd.uploaded?.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <small>
                            <strong>Subidos:</strong>{" "}
                            {evd.uploaded.map((f, i) => (
                              <a
                                key={i}
                                href={`${API}${f.url}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ marginRight: 10 }}
                              >
                                {f.filename}
                              </a>
                            ))}
                          </small>
                        </div>
                      )}
                    </div>
                  )}

                  {/* guardar */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-primary"
                      onClick={() => saveControl(clave)}
                      style={{
                        background: "#5b6bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 14px",
                        cursor: "pointer",
                      }}
                    >
                      Guardar cambios
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
