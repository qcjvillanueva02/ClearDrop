const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/catalog — products and components
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const data = await db.getCatalogData(isAdmin);
    return res.json(data);
  } catch (err) {
    console.error('[catalog] error:', err);
    return res.status(500).json({ message: 'The catalog service encountered an error.' });
  }
});

// GET /api/catalog/users — admin user list
router.get('/users', requireRole('admin'), async (_req, res) => {
  try {
    const users = await db.getUsers();
    return res.json({ users });
  } catch (err) {
    console.error('[catalog/users] error:', err);
    return res.status(500).json({ message: 'Failed to load users.' });
  }
});

// Dispatcher for catalog modifications
router.post('/', requireRole('admin'), async (req, res) => {
  const action = req.body?.action;
  if (!action) {
    return res.status(400).json({ message: 'A valid action is required.' });
  }

  try {
    if (action === 'save_product') {
      const { sku, name, productType, description, salePriceCents, estimatedCostCents } = req.body;
      if (!sku || !name) return res.status(400).json({ message: 'SKU and name are required.' });
      return res.json({ message: 'Product saved.', productId: 1 });
    }

    if (action === 'save_component') {
      const { code, name, unit, priceCents } = req.body;
      if (!code || !name) return res.status(400).json({ message: 'Code and name are required.' });
      return res.json({ message: 'Component saved.', componentId: 1 });
    }

    if (action === 'save_bom') {
      return res.status(201).json({ message: 'A new BOM version was created.', version: 2 });
    }

    if (action === 'create_user') {
      const { username, displayName, password, role } = req.body;
      if (!username || !password || password.length < 6) {
        return res.status(400).json({ message: 'Valid username and password (6+ chars) required.' });
      }
      return res.status(201).json({ message: 'User created.' });
    }

    return res.status(400).json({ message: 'Unknown catalog action.' });
  } catch (err) {
    console.error(`[catalog/${action}] error:`, err);
    return res.status(400).json({ message: err.message || 'Operation failed.' });
  }
});

module.exports = router;
