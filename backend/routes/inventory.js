const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/inventory/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { username, role } = req.user;
    const data = await db.getDashboardData(username, role);
    return res.json(data);
  } catch (err) {
    console.error('[inventory/dashboard] error:', err);
    return res.status(500).json({ message: 'The inventory service encountered an error.' });
  }
});

// Generic POST handler for unified action dispatching
router.post('/', async (req, res) => {
  const action = req.body?.action;
  if (!action) {
    return res.status(400).json({ message: 'A valid action is required.' });
  }

  try {
    const { username, role } = req.user;

    if (action === 'cart_add') {
      const code = req.body.code;
      if (!code) return res.status(400).json({ message: 'Enter a valid material QR code.' });
      const result = await db.cartAdd(username, code);
      return res.json(result);
    }

    if (action === 'cart_remove') {
      const materialId = req.body.materialId;
      if (!materialId) return res.status(400).json({ message: 'Choose a valid basket item.' });
      const result = await db.cartRemove(username, materialId);
      return res.json(result);
    }

    if (action === 'checkout') {
      const { customerName, contact } = req.body;
      if (!customerName || !contact || customerName.trim().length < 2 || contact.trim().length < 5) {
        return res.status(400).json({ message: 'Enter a name and contact number before checkout.' });
      }
      const result = await db.checkout(username, customerName.trim(), contact.trim());
      return res.status(201).json(result);
    }

    if (action === 'restock') {
      if (role !== 'admin') return res.status(403).json({ message: 'Only the stock manager can restock materials.' });
      const { materialId, quantity } = req.body;
      const result = await db.restock(materialId, quantity);
      return res.json(result);
    }

    if (action === 'order_status') {
      if (role !== 'admin') return res.status(403).json({ message: 'Only the stock manager can update order statuses.' });
      const { orderId, status } = req.body;
      const result = await db.updateOrderStatus(orderId, status, role);
      return res.json(result);
    }

    return res.status(400).json({ message: 'Unknown inventory action.' });
  } catch (err) {
    console.error(`[inventory/${action}] error:`, err);
    return res.status(400).json({ message: err.message || 'Operation failed.' });
  }
});

// RESTful aliases for specific actions:
router.post('/cart/add', async (req, res) => {
  try {
    const code = req.body?.code;
    if (!code) return res.status(400).json({ message: 'Enter a valid material QR code.' });
    const result = await db.cartAdd(req.user.username, code);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

router.post('/cart/remove', async (req, res) => {
  try {
    const materialId = req.body?.materialId;
    if (!materialId) return res.status(400).json({ message: 'Choose a valid basket item.' });
    const result = await db.cartRemove(req.user.username, materialId);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    const { customerName, contact } = req.body || {};
    if (!customerName || !contact) return res.status(400).json({ message: 'Name and contact are required.' });
    const result = await db.checkout(req.user.username, customerName.trim(), contact.trim());
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

router.post('/restock', requireRole('admin'), async (req, res) => {
  try {
    const { materialId, quantity } = req.body || {};
    const result = await db.restock(materialId, quantity);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

router.post('/order-status', requireRole('admin'), async (req, res) => {
  try {
    const { orderId, status } = req.body || {};
    const result = await db.updateOrderStatus(orderId, status, req.user.role);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

module.exports = router;
