// src/modules/laws/Laws.jsx
import "../../modules/laws/Laws.css";
import evaluacionImg from "@/assets/logoLOGIN.png";
import { useState } from "react";
import EvaluacionFormulario from "./EvaluacionFormulario";

const logoGDPR = evaluacionImg;
const logoJM   = evaluacionImg;

const Laws = () => {
  const [normativaSeleccionada, setNormativaSeleccionada] = useState(null);

  return (
    <>
      <div className="page-container evaluation-container">
        <section className="home-hero laws-hero">
          <div className="home-hero__inner">
            <div className="home-hero__badge">Plataforma de Evaluación</div>
            <h1 className="home-hero__title">
              Evaluación de <span>Leyes</span>
            </h1>
            <p className="home-hero__subtitle">
              Aquí puedes seleccionar las leyes y regulaciones que deseas evaluar según el marco legal y regulatorio.
              Responde los controles para visualizar el cumplimiento y generar un informe con recomendaciones.
            </p>
          </div>
        </section>

        <div className="laws-list">
          <div className="law-card" onClick={() => setNormativaSeleccionada("GDPR")}>
            <div className="law-card__logo law-card__logo--violet">
              <img src={logoGDPR} alt="GDPR" />
            </div>
            <div className="law-card__content">
              <h3 className="law-card__title">GDPR (Europa)</h3>
              <p className="law-card__text">
                Reglamento General de Protección de Datos. Marco clave para privacidad y protección de datos.
              </p>
            </div>
          </div>

          <div className="law-card" onClick={() => setNormativaSeleccionada("JM")}>
            <div className="law-card__logo law-card__logo--indigo">
              <img src={logoJM} alt="JM 104-2021" />
            </div>
            <div className="law-card__content">
              <h3 className="law-card__title">JM 104-2021 (Guatemala)</h3>
              <p className="law-card__text">
                Resolución JM 104-2021. Requisitos para continuidad del negocio y seguridad de la información en entidades supervisadas.
              </p>
            </div>
          </div>
        </div>

        {normativaSeleccionada && (
          <EvaluacionFormulario normativaSeleccionada={normativaSeleccionada} />
        )}
      </div>
    </>
  );
};

export default Laws;
