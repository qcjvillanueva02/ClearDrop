const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/auth/status — check session/token validity
router.get('/status', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }

  const token = authHeader.split(' ')[1];
  try {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod';
    const decoded = jwt.verify(token, secret);
    return res.json({
      authenticated: true,
      username: decoded.username,
      displayName: decoded.displayName || decoded.username,
      role: decoded.role,
      userId: decoded.userId
    });
  } catch {
    return res.json({ authenticated: false });
  }
});

// POST /api/auth/login — password authentication
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Enter a valid username and password.' });
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Incorrect demo username or password.' });
    }

    if (user.active !== 1) {
      return res.status(403).json({ message: 'This ClearDrop account is inactive. Contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect demo username or password.' });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role_key
    });

    return res.json({
      authenticated: true,
      token,
      username: user.username,
      displayName: user.display_name,
      role: user.role_key,
      roleName: user.role_name,
      email: user.email || null
    });
  } catch (err) {
    console.error('[auth/login] error:', err);
    return res.status(500).json({ message: 'The sign-in service encountered an error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  return res.json({ authenticated: false, message: 'Logged out successfully.' });
});

// GET /api/auth/google_config
router.get('/google_config', (_req, res) => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  res.json({
    enabled: Boolean(clientId),
    clientId: clientId || null
  });
});

module.exports = router;
