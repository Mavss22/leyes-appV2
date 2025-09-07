// src/pages/Login.jsx
import React, { useState } from "react";
import "./Login.css";
import logo from "@/assets/logoLOGIN.png";
import rocketImg from "@/assets/Rocket-PNG-High-Quality-Image.png";
import { useNavigate } from "react-router-dom";
import { apiPost } from "@/api"; // ← USAR SIEMPRE apiPost (toma VITE_API_URL)

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = atob(b64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const body = {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      };

      // 🔁 SIEMPRE va al backend (usa VITE_API_URL dentro de apiPost)
      const data = await apiPost("/api/auth/login", body);

      if (!data?.token) {
        throw new Error("Respuesta inválida del servidor (falta token)");
      }

      localStorage.setItem("token", data.token);

      // Preferir user del backend; si no viene, derivarlo del JWT
      let user = data.user ?? null;
      if (!user) {
        const payload = decodeJwt(data.token);
        if (payload) {
          user = {
            id: payload.id ?? payload.sub ?? null,
            name: payload.name ?? payload.nombre ?? "",
            email: payload.email ?? "",
            role: payload.role ?? payload.rol ?? "user",
          };
        }
      }
      if (user) localStorage.setItem("user", JSON.stringify(user));

      setMsg("Login exitoso. Redirigiendo…");
      setTimeout(() => navigate("/home"), 800);
    } catch (err) {
      setMsg(err.message || "Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Columna izquierda: tarjeta centrada */}
      <div className="login-left">
        <div className="login-box">
          <img src={logo} alt="Logo" className="login-logo" />
          <h2>Iniciar sesión</h2>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {msg && <div className="login-error">{msg}</div>}
        </div>
      </div>

      {/* Columna derecha: ilustración */}
      <div className="login-right">
        <div className="login-illustration">
          <img src={rocketImg} alt="Rocket" />
        </div>
      </div>
    </div>
  );
};

export default Login;
