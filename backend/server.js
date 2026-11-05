require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { startKeepAlive } = require('./cron/keepAlive');

const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const catalogRoutes = require('./routes/catalog');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// CORS CONFIGURATION
// ---------------------------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

if (process.env.FRONTEND_URL) {
  // Support comma-separated URLs or single URL
  process.env.FRONTEND_URL.split(',').forEach(url => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    // In production, log and still permit if user is testing their custom domain
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser
app.use(express.json());

// ---------------------------------------------------------------------------
// HEALTH & WELCOME ENDPOINTS
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ClearDrop Backend API',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (_req, res) => {
  res.json({
    service: 'ClearDrop Gravity Filter System API',
    status: 'running',
    health: '/api/health',
    endpoints: ['/api/auth', '/api/inventory', '/api/catalog']
  });
});

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/catalog', catalogRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ---------------------------------------------------------------------------
// START SERVER & CRON
// ---------------------------------------------------------------------------
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` ClearDrop Node.js API Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);

  // Start self-ping cron job to keep Render free tier awake 24/7
  startKeepAlive(PORT);
});

module.exports = { app, server };
