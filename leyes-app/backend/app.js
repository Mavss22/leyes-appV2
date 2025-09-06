// app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const auth = require('./middlewares/auth');
const requireAdmin = require('./middlewares/requireAdmin');

// ---------- Rutas ----------
// IMPORTANTE: en Linux el FS es sensible a mayúsculas/minúsculas.
// En su estructura aparecen estos nombres:
//   CompanyRoutes.js  (C mayúscula)
//   EvidenceRoutes.js (E mayúscula)
// Se cargan con el mismo “case”.
const authRoutes            = require('./routes/authRoutes');             // /api/auth/*
const companyRoutes         = require('./routes/CompanyRoutes');          // /api/empresas
const evaRoutes             = require('./routes/evaRoutes');              // /api/controles/:normativa ...
const evidenceRoutes        = require('./routes/EvidenceRoutes');         // /api/evidencias
const evaluationRoutes      = require('./routes/evaluationRoutes');       // /api/evaluaciones

// Admin
const adminRegRoutes        = require('./routes/adminRegRoutes');         // /api/admin/regulaciones...
const adminUploadRoutes     = require('./routes/adminUploadRoutes');      // /api/admin/importar...
const adminCompaniesRoutes  = require('./routes/adminCompaniesRoutes');   // /api/admin/empresas...

const app = express();

// detrás de proxy (Railway, Render, etc.)
app.set('trust proxy', 1);

// ---------- Seguridad ----------
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' }
  })
);

// Logs
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ---------- CORS ----------
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173';
const originsList = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);
const allowAll = originsList.includes('*');

const corsOptions = {
  origin(origin, cb) {
    if (allowAll || !origin || originsList.includes(origin)) return cb(null, true);
    return cb(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
// app.options('*', cors(corsOptions));

// ---------- Parsers ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------- Health & Root ----------
app.get('/', (_req, res) => res.send('Leyes-App API OK'));
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------- Públicas ----------
app.use('/api/auth', authRoutes);

// Empresas
app.use('/api', companyRoutes);

// ---------- Protegidas (requieren token) ----------
app.use('/api', auth, evaRoutes);
app.use('/api', auth, evidenceRoutes);
app.use('/api', auth, evaluationRoutes);

// ---------- Admin (token + rol admin) ----------
app.use('/api/admin', auth, requireAdmin, adminCompaniesRoutes);
app.use('/api/admin', auth, requireAdmin, adminRegRoutes);
app.use('/api/admin', auth, requireAdmin, adminUploadRoutes);

// ---------- Archivos subidos ----------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ping admin (protegida)
app.get('/api/admin/ping', auth, requireAdmin, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// ---------- 404 ----------
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ---------- Error handler ----------
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
// bind 0.0.0.0 para Railway
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor backend corriendo en puerto ${PORT}`));
