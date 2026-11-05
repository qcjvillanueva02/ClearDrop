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
  process.env.FRONTEND_URL.split(',').forEach(url => {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin.includes('github.io')
    ) {
      return callback(null, true);
    }
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

app.get('/health', (_req, res) => {
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
    endpoints: [
      '/api/auth',
      '/auth',
      '/api/inventory',
      '/inventory',
      '/api/catalog',
      '/catalog'
    ]
  });
});

// ---------------------------------------------------------------------------
// COMPREHENSIVE ROUTE MOUNTING (Handles both /api/xxx and /xxx)
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/inventory', inventoryRoutes);
app.use('/inventory', inventoryRoutes);

app.use('/api/catalog', catalogRoutes);
app.use('/catalog', catalogRoutes);

// Direct shortcuts for common endpoints
app.post('/login', (req, res, next) => {
  req.url = '/login';
  authRoutes(req, res, next);
});

app.get('/status', (req, res, next) => {
  req.url = '/status';
  authRoutes(req, res, next);
});

app.post('/logout', (req, res, next) => {
  req.url = '/logout';
  authRoutes(req, res, next);
});

// Backward compatibility with legacy PHP script URLs
app.all('/auth.php', (req, res, next) => {
  const action = req.query?.action || req.body?.action;
  if (action === 'status' || req.method === 'GET') {
    req.url = '/status';
  } else {
    req.url = '/login';
  }
  authRoutes(req, res, next);
});

app.all('/inventory-api.php', (req, res, next) => {
  if (req.method === 'GET') {
    req.url = '/dashboard';
  } else {
    req.url = '/';
  }
  inventoryRoutes(req, res, next);
});

app.all('/catalog-api.php', (req, res, next) => {
  req.url = '/';
  catalogRoutes(req, res, next);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'API route not found',
    requestedPath: req.path,
    supportedPrefixes: ['/api/auth', '/auth', '/api/inventory', '/inventory', '/api/catalog', '/catalog']
  });
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
  console.log(` Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`====================================================`);

  // Start self-ping cron job to keep Render free tier awake 24/7
  startKeepAlive(PORT);
});

module.exports = { app, server };
