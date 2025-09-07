// src/modules/admin/CreadorControlAdmin.jsx
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/api";

export default function CreadorControlAdmin() {
  const [regs, setRegs] = useState([]);
  const [regId, setRegId] = useState("");
  const [arts, setArts] = useState([]);
  const [artId, setArtId] = useState("");
  const [form, setForm] = useState({ clave:"", pregunta:"", recomendacion:"", peso:1 });

  useEffect(() => {
    apiGet("/api/admin/regulaciones").then(setRegs).catch(console.error);
  }, []);

  useEffect(() => {
    if (!regId) { setArts([]); return; }
    apiGet(`/api/admin/regulaciones/${regId}/articulos`)
      .then(setArts)
      .catch(() => setArts([]));
  }, [regId]);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      regulacion_id: regId,
      articulo_id: artId || null,
      clave: form.clave || null,
      pregunta: form.pregunta,
      recomendacion: form.recomendacion || null,
      peso: Number(form.peso) || 1
    };
    const ok = await apiPost("/api/admin/controles", payload).then(()=>true).catch(()=>false);
    if (ok) {
      setForm({ clave:"", pregunta:"", recomendacion:"", peso:1 });
      setArtId("");
      alert("Control creado");
    } else {
      alert("Error creando control");
    }
  };

  const artSel = arts.find(a => a.id === artId);

  return (
    <div className="page-container">
      <h1>Nuevo Control — Administración</h1>
      <form onSubmit={submit} className="g-card" style={{ maxWidth: 820 }}>
        <label>Regulación</label>
        <select value={regId} onChange={e=>setRegId(e.target.value)} required>
          <option value="">Seleccione</option>
          {regs.map(r => <option key={r.id} value={r.id}>{(r.codigo||r.code)} — {(r.nombre||r.name)}</option>)}
        </select>

        <label style={{marginTop:12}}>Artículo (opcional)</label>
        <select value={artId} onChange={e=>setArtId(e.target.value)}>
          <option value="">— Sin artículo —</option>
          {arts.map(a => (
            <option key={a.id} value={a.id}>
              {(a.codigo || a.code || 's/art')} — {(a.titulo || a.title || 'sin título')?.slice(0,80)}
            </option>
          ))}
        </select>

        {artId && (
          <div className="g-card" style={{ marginTop: 12, background: "#f7f9fc" }}>
            <b>{artSel?.codigo || artSel?.code} — {artSel?.titulo || artSel?.title}</b>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {(artSel?.cuerpo || artSel?.body || "").slice(0,800) || 'Sin texto'}
            </p>
          </div>
        )}

        <label style={{marginTop:12}}>Clave</label>
        <input value={form.clave} onChange={e=>setForm({...form, clave:e.target.value})} />

        <label>Pregunta</label>
        <textarea rows={3} value={form.pregunta}
          onChange={e=>setForm({...form, pregunta:e.target.value})} required />

        <label>Recomendación</label>
        <textarea rows={3} value={form.recomendacion}
          onChange={e=>setForm({...form, recomendacion:e.target.value})} />

        <label>Peso</label>
        <input type="number" min="0.5" step="0.5"
          value={form.peso} onChange={e=>setForm({...form, peso:e.target.value})} />

        <button type="submit" className="btn-primary" style={{marginTop:16}}>Guardar control</button>
      </form>
    </div>
  );
}
