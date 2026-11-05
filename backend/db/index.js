const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'));

let sqliteDb = null;
if (!isSupabaseConfigured) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    // Look in current dir, parent dir, or fallback to local backend sqlite file
    let dbPath = process.env.SQLITE_DB_PATH;
    if (!dbPath) {
      const candidates = [
        path.resolve(__dirname, '../../cleardrop.sqlite'),
        path.resolve(__dirname, '../cleardrop.sqlite'),
        path.resolve(process.cwd(), 'cleardrop.sqlite')
      ];
      dbPath = candidates.find(p => fs.existsSync(p)) || path.resolve(__dirname, '../cleardrop.sqlite');
    }

    sqliteDb = new DatabaseSync(dbPath);
    console.log(`[db] Using local SQLite database at: ${dbPath}`);
    ensureSqliteTables(sqliteDb);
  } catch (err) {
    console.warn('[db] SQLite initialization note:', err.message);
  }
}

function ensureSqliteTables(db) {
  try {
    const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (tableExists) return;

    console.log('[db] Initializing SQLite database schema and seed data...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        google_sub TEXT,
        email TEXT,
        auth_provider TEXT NOT NULL DEFAULT 'password',
        role_id INTEGER NOT NULL REFERENCES roles(id),
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS components (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        unit TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        price_cents INTEGER NOT NULL DEFAULT 0,
        low_stock_at INTEGER NOT NULL DEFAULT 5,
        estimated_unit_cost_cents INTEGER,
        cost_is_estimate INTEGER NOT NULL DEFAULT 1,
        orderable INTEGER NOT NULL DEFAULT 1,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        product_type TEXT NOT NULL,
        description TEXT NOT NULL,
        sale_price_cents INTEGER NOT NULL,
        estimated_unit_cost_cents INTEGER,
        cost_is_estimate INTEGER NOT NULL DEFAULT 1,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS bom_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        version INTEGER NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_by INTEGER REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (product_id, version)
      );
      CREATE TABLE IF NOT EXISTS bom_items (
        bom_version_id INTEGER NOT NULL REFERENCES bom_versions(id),
        component_id INTEGER NOT NULL REFERENCES components(id),
        quantity_milli INTEGER NOT NULL,
        PRIMARY KEY (bom_version_id, component_id)
      );
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        contact TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        total_cents INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS order_items (
        order_id INTEGER NOT NULL REFERENCES orders(id),
        material_id INTEGER NOT NULL REFERENCES components(id),
        material_name TEXT NOT NULL,
        unit TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price_cents INTEGER NOT NULL,
        PRIMARY KEY (order_id, material_id)
      );
      CREATE TABLE IF NOT EXISTS order_reservations (
        username TEXT NOT NULL,
        material_id INTEGER NOT NULL REFERENCES components(id),
        quantity INTEGER NOT NULL,
        PRIMARY KEY (username, material_id)
      );

      INSERT OR IGNORE INTO roles (id, role_key, name, description) VALUES
        (1, 'admin', 'Admin / Owner', 'Full access to inventory, catalog, and users'),
        (2, 'inventory', 'Inventory & Purchasing', 'Manages materials and stock'),
        (3, 'production', 'Production / Assembler', 'Builds units based on BOM'),
        (4, 'sales', 'Sales & Orders', 'Manages orders and customer requests'),
        (5, 'partner', 'Partner / Customer', 'Community partner access'),
        (6, 'distributor', 'Community Distributor', 'Community distribution hub'),
        (7, 'customer', 'Demo Customer', 'Orders filter materials');

      INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role_id, active) VALUES
        (1, 'clearadmin', 'ClearDrop Demo Admin', '$2a$10$oYq0wRk72Yp5z0G6o1f4i.w7c6iN1M0Yf5c7U9K.F1o5j1E4f2m1W', 1, 1),
        (2, 'clearinventory', 'Inventory Specialist', '$2a$10$oYq0wRk72Yp5z0G6o1f4i.w7c6iN1M0Yf5c7U9K.F1o5j1E4f2m1W', 2, 1),
        (3, 'clearproduction', 'Production Assembler', '$2a$10$oYq0wRk72Yp5z0G6o1f4i.w7c6iN1M0Yf5c7U9K.F1o5j1E4f2m1W', 3, 1),
        (4, 'clearsales', 'Sales Coordinator', '$2a$10$oYq0wRk72Yp5z0G6o1f4i.w7c6iN1M0Yf5c7U9K.F1o5j1E4f2m1W', 4, 1),
        (5, 'clearpartner', 'Community Partner', '$2a$10$oYq0wRk72Yp5z0G6o1f4i.w7c6iN1M0Yf5c7U9K.F1o5j1E4f2m1W', 5, 1),
        (6, 'cleardistributor', 'Local Distributor', '$2a$10$oYq0wRk72Yp5z0G6o1f4i.w7c6iN1M0Yf5c7U9K.F1o5j1E4f2m1W', 6, 1),
        (7, 'clear2026', 'Demo Household Customer', '$2a$10$d8V7yY2Yv7h5G7m9K.F1o5j1E4f2m1WoYq0wRk72Yp5z0G6o1f4i.', 7, 1);

      INSERT OR IGNORE INTO components (id, code, name, description, unit, stock, price_cents, low_stock_at, estimated_unit_cost_cents, cost_is_estimate, orderable, active) VALUES
        (1, 'CLD-MESH-001', 'Intake Screen Mesh', '304 stainless steel pre-screen filter to block coarse debris.', 'piece', 50, 12000, 5, 7500, 1, 1, 1),
        (2, 'CLD-GRAVEL-001', 'Graded Gravel Media', 'Washed coarse gravel for the primary sediment settling bed.', 'kg', 200, 2500, 20, 1200, 1, 1, 1),
        (3, 'CLD-SAND-001', 'Fine Filter Sand', 'Silica filter sand (0.45-0.55mm) for fine particulate entrapment.', 'kg', 150, 3000, 15, 1500, 1, 1, 1),
        (4, 'CLD-CARBON-001', 'Activated Carbon Granules', 'Coconut shell activated carbon for chlorine, color, and odor removal.', 'kg', 80, 18000, 10, 9500, 1, 1, 1),
        (5, 'CLD-CERAMIC-001', 'Ceramic Filter Candle', 'Micro-porous 0.2 micron ceramic candle element for bacteria filtration.', 'piece', 60, 35000, 8, 21000, 1, 1, 1),
        (6, 'CLD-TANK-001', 'HDPE Water Storage Tank (20L)', 'Food-grade certified polyethylene lower reservoir with lid.', 'piece', 25, 85000, 5, 52000, 1, 1, 1),
        (7, 'CLD-FAUCET-001', 'Dispensing Outlet Tap', 'Sanitary push-lever faucet with food-grade silicone washers.', 'piece', 40, 9500, 5, 4500, 1, 1, 1),
        (8, 'CLD-GASKET-001', 'Tank Lid Gasket', 'Airtight EPDM gasket preventing external dust and insect intrusion.', 'piece', 100, 4500, 15, 2000, 1, 1, 1),
        (9, 'CLD-PIPE-001', 'Connector Pipe Set', 'Food-grade PVC interconnect pipe set with flow-control valve.', 'set', 35, 11000, 5, 6000, 1, 1, 1),
        (10, 'CLD-ORING-001', 'Silicone O-Ring Pack', 'Replacement pack of 5 high-temperature sealing O-rings.', 'pack', 120, 3500, 20, 1500, 1, 1, 1),
        (11, 'CLD-UV-001', 'UV Disinfection Lamp Module', 'Low-voltage 12V DC germicidal ultraviolet chamber add-on.', 'piece', 15, 120000, 3, 75000, 1, 1, 1),
        (12, 'CLD-ADAPTER-001', 'Power Adapter 12V/2A', 'Regulated AC/DC adapter for optional UV disinfection module.', 'piece', 20, 28000, 5, 16000, 1, 1, 1),
        (13, 'CLD-BRACKET-001', 'Wall/Base Mounting Bracket', 'Powder-coated steel bracket for elevated gravity filter placement.', 'piece', 45, 6500, 8, 3500, 1, 1, 1),
        (14, 'CLD-LABEL-001', 'QR Maintenance Label Sheet', 'Weatherproof adhesive QR label for maintenance and ordering tracking.', 'sheet', 500, 1500, 50, 500, 1, 1, 1);

      INSERT OR IGNORE INTO products (id, sku, name, product_type, description, sale_price_cents, estimated_unit_cost_cents, cost_is_estimate, active) VALUES
        (1, 'CD-UNIT-001', 'ClearDrop Standard Gravity Filter Unit', 'Complete household gravity water filter system with 20L storage and 4-stage media.', 350000, 195000, 1, 1),
        (2, 'CD-CART-001', 'ClearDrop Annual Media Replacement Pack', 'Complete replacement media cartridge kit: sand, carbon, and ceramic candle.', 85000, 48000, 1, 1);

      INSERT OR IGNORE INTO bom_versions (id, product_id, version, notes, created_by) VALUES
        (1, 1, 1, 'Initial standard bill of materials for household gravity filter unit', 1),
        (2, 2, 1, 'Annual replacement consumables pack', 1);

      INSERT OR IGNORE INTO bom_items (bom_version_id, component_id, quantity_milli) VALUES
        (1, 1, 1000), (1, 2, 3000), (1, 3, 4000), (1, 4, 1500), (1, 5, 1000), (1, 6, 1000), (1, 7, 1000), (1, 8, 1000), (1, 9, 1000),
        (2, 3, 3000), (2, 4, 1500), (2, 5, 1000);
    `);
    console.log('[db] SQLite database seeded successfully.');
  } catch (err) {
    console.warn('[db] SQLite schema setup error:', err.message);
  }
}

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

if (isSupabaseConfigured) {
  console.log(`[db] Connected to Supabase at: ${supabaseUrl}`);
}

// ---------------------------------------------------------------------------
// AUTH QUERIES
// ---------------------------------------------------------------------------

async function getUserByUsername(username) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, password_hash, active, role_id, email, roles(role_key, name)')
      .ilike('username', username.trim())
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      password_hash: data.password_hash,
      active: Number(data.active),
      role_key: data.roles?.role_key || 'customer',
      role_name: data.roles?.name || 'Demo Customer',
      email: data.email
    };
  }

  // Local SQLite mode
  const stmt = sqliteDb.prepare(`
    SELECT u.id, u.username, u.display_name, u.password_hash, u.active, u.email, r.role_key, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE LOWER(u.username) = LOWER(?) AND u.deleted_at IS NULL
  `);
  const row = stmt.get(username.trim());
  return row || null;
}

async function getUserById(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, role_id, email, roles(role_key)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      role_key: data.roles?.role_key || 'customer',
      email: data.email
    };
  }

  const row = sqliteDb.prepare(`
    SELECT u.id, u.username, u.display_name, u.email, r.role_key
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND u.deleted_at IS NULL
  `).get(id);
  return row || null;
}

// ---------------------------------------------------------------------------
// INVENTORY & ORDER QUERIES
// ---------------------------------------------------------------------------

async function getDashboardData(username, role) {
  if (isSupabaseConfigured) {
    const { data: materials } = await supabase
      .from('components')
      .select('id, code, name, description, unit, stock, price_cents, low_stock_at')
      .eq('active', 1)
      .eq('orderable', 1)
      .order('name');

    const { data: cart } = await supabase
      .from('order_reservations')
      .select('material_id, quantity, components(code, name, unit, price_cents)')
      .eq('username', username);

    const formattedCart = (cart || []).map(r => ({
      id: r.material_id,
      code: r.components?.code,
      name: r.components?.name,
      unit: r.components?.unit,
      quantity: r.quantity,
      price_cents: r.components?.price_cents
    }));

    let ordersQuery = supabase
      .from('orders')
      .select('id, username, customer_name, contact, status, total_cents, created_at, order_items(material_name, unit, quantity, price_cents)')
      .order('id', { ascending: false })
      .limit(30);

    if (role !== 'admin') {
      ordersQuery = ordersQuery.eq('username', username);
    }

    const { data: orders } = await ordersQuery;
    const formattedOrders = (orders || []).map(o => ({
      id: o.id,
      username: o.username,
      customer_name: o.customer_name,
      contact: o.contact,
      status: o.status,
      total_cents: o.total_cents,
      created_at: o.created_at,
      items: (o.order_items || []).map(i => ({
        name: i.material_name,
        unit: i.unit,
        quantity: i.quantity,
        price_cents: i.price_cents
      }))
    }));

    return {
      materials: materials || [],
      cart: formattedCart,
      orders: formattedOrders,
      role
    };
  }

  // SQLite mode
  const materials = sqliteDb.prepare(`
    SELECT id, code, name, description, unit, stock, price_cents, low_stock_at
    FROM components WHERE active = 1 AND orderable = 1 ORDER BY name
  `).all();

  const cart = sqliteDb.prepare(`
    SELECT r.material_id AS id, m.code, m.name, m.unit, r.quantity, m.price_cents
    FROM order_reservations r JOIN components m ON m.id = r.material_id
    WHERE r.username = ? ORDER BY m.name
  `).all(username);

  const ordersSql = `
    SELECT id, username, customer_name, contact, status, total_cents, created_at
    FROM orders ${role === 'admin' ? '' : 'WHERE username = ?'}
    ORDER BY id DESC LIMIT 30
  `;
  const orders = role === 'admin'
    ? sqliteDb.prepare(ordersSql).all()
    : sqliteDb.prepare(ordersSql).all(username);

  const itemStmt = sqliteDb.prepare(`
    SELECT material_name AS name, unit, quantity, price_cents
    FROM order_items WHERE order_id = ? ORDER BY material_name
  `);
  for (const order of orders) {
    order.items = itemStmt.all(order.id);
  }

  return { materials, cart, orders, role };
}

async function cartAdd(username, code) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (isSupabaseConfigured) {
    const { data: comp } = await supabase
      .from('components')
      .select('id, name, stock')
      .eq('code', cleanCode)
      .eq('active', 1)
      .maybeSingle();

    if (!comp) throw new Error('That QR code does not match a stocked ClearDrop material.');
    if (comp.stock < 1) throw new Error(`${comp.name} is out of stock.`);

    await supabase.from('components').update({ stock: comp.stock - 1 }).eq('id', comp.id);

    const { data: existing } = await supabase
      .from('order_reservations')
      .select('quantity')
      .eq('username', username)
      .eq('material_id', comp.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('order_reservations').update({ quantity: existing.quantity + 1 }).match({ username, material_id: comp.id });
    } else {
      await supabase.from('order_reservations').insert({ username, material_id: comp.id, quantity: 1 });
    }
    return { message: 'One unit reserved in your basket.' };
  }

  // SQLite mode
  const comp = sqliteDb.prepare(`
    SELECT id, name, stock FROM components WHERE code = ? AND active = 1 AND orderable = 1
  `).get(cleanCode);

  if (!comp) throw new Error('That QR code does not match a stocked ClearDrop material.');
  if (comp.stock < 1) throw new Error(`${comp.name} is out of stock.`);

  sqliteDb.exec('BEGIN');
  try {
    sqliteDb.prepare('UPDATE components SET stock = stock - 1 WHERE id = ?').run(comp.id);
    sqliteDb.prepare(`
      INSERT INTO order_reservations (username, material_id, quantity) VALUES (?, ?, 1)
      ON CONFLICT(username, material_id) DO UPDATE SET quantity = quantity + 1
    `).run(username, comp.id);
    sqliteDb.exec('COMMIT');
    return { message: 'One unit reserved in your basket.' };
  } catch (err) {
    sqliteDb.exec('ROLLBACK');
    throw err;
  }
}

async function cartRemove(username, materialId) {
  const mId = Number(materialId);
  if (isSupabaseConfigured) {
    const { data: res } = await supabase
      .from('order_reservations')
      .select('quantity')
      .eq('username', username)
      .eq('material_id', mId)
      .maybeSingle();

    if (!res) throw new Error('That item is no longer in your basket.');

    const { data: comp } = await supabase.from('components').select('stock').eq('id', mId).single();
    if (comp) {
      await supabase.from('components').update({ stock: comp.stock + 1 }).eq('id', mId);
    }

    if (res.quantity <= 1) {
      await supabase.from('order_reservations').delete().match({ username, material_id: mId });
    } else {
      await supabase.from('order_reservations').update({ quantity: res.quantity - 1 }).match({ username, material_id: mId });
    }
    return { message: 'One unit returned to stock.' };
  }

  sqliteDb.exec('BEGIN');
  try {
    const row = sqliteDb.prepare('SELECT quantity FROM order_reservations WHERE username = ? AND material_id = ?').get(username, mId);
    if (!row) throw new Error('That item is no longer in your basket.');

    sqliteDb.prepare('UPDATE components SET stock = stock + 1 WHERE id = ?').run(mId);
    if (row.quantity === 1) {
      sqliteDb.prepare('DELETE FROM order_reservations WHERE username = ? AND material_id = ?').run(username, mId);
    } else {
      sqliteDb.prepare('UPDATE order_reservations SET quantity = quantity - 1 WHERE username = ? AND material_id = ?').run(username, mId);
    }
    sqliteDb.exec('COMMIT');
    return { message: 'One unit returned to stock.' };
  } catch (err) {
    sqliteDb.exec('ROLLBACK');
    throw err;
  }
}

async function restock(materialId, quantity) {
  const mId = Number(materialId);
  const qty = Number(quantity);
  if (!mId || !qty || qty < 1) throw new Error('Restock quantity must be at least 1.');

  if (isSupabaseConfigured) {
    const { data: comp } = await supabase.from('components').select('stock').eq('id', mId).single();
    if (!comp) throw new Error('Material not found.');
    await supabase.from('components').update({ stock: comp.stock + qty }).eq('id', mId);
    return { message: 'Stock updated.' };
  }

  const res = sqliteDb.prepare('UPDATE components SET stock = stock + ? WHERE id = ? AND active = 1').run(qty, mId);
  if (res.changes === 0) throw new Error('Material not found.');
  return { message: 'Stock updated.' };
}

async function checkout(username, customerName, contact) {
  if (isSupabaseConfigured) {
    const { data: cart } = await supabase
      .from('order_reservations')
      .select('material_id, quantity, components(name, unit, price_cents)')
      .eq('username', username);

    if (!cart || cart.length === 0) throw new Error('Add at least one material before checkout.');

    const totalCents = cart.reduce((sum, item) => sum + (item.components?.price_cents || 0) * item.quantity, 0);

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        username,
        customer_name: customerName,
        contact,
        total_cents: totalCents,
        status: 'pending'
      })
      .select()
      .single();

    if (oErr || !order) throw new Error('Failed to create order.');

    const items = cart.map(item => ({
      order_id: order.id,
      material_id: item.material_id,
      material_name: item.components?.name || 'Material',
      unit: item.components?.unit || 'unit',
      quantity: item.quantity,
      price_cents: item.components?.price_cents || 0
    }));

    await supabase.from('order_items').insert(items);
    await supabase.from('order_reservations').delete().eq('username', username);

    return { message: 'Order placed and marked pending.', orderId: order.id };
  }

  sqliteDb.exec('BEGIN');
  try {
    const cart = sqliteDb.prepare(`
      SELECT r.material_id, r.quantity, m.name, m.unit, m.price_cents
      FROM order_reservations r JOIN components m ON m.id = r.material_id
      WHERE r.username = ?
    `).all(username);

    if (!cart || cart.length === 0) throw new Error('Add at least one material before checkout.');

    const totalCents = cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);

    const res = sqliteDb.prepare(`
      INSERT INTO orders (username, customer_name, contact, total_cents, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(username, customerName, contact, totalCents);

    const orderId = Number(res.lastInsertRowid);
    const insertItem = sqliteDb.prepare(`
      INSERT INTO order_items (order_id, material_id, material_name, unit, quantity, price_cents)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of cart) {
      insertItem.run(orderId, item.material_id, item.name, item.unit, item.quantity, item.price_cents);
    }

    sqliteDb.prepare('DELETE FROM order_reservations WHERE username = ?').run(username);
    sqliteDb.exec('COMMIT');

    return { message: 'Order placed and marked pending.', orderId };
  } catch (err) {
    sqliteDb.exec('ROLLBACK');
    throw err;
  }
}

async function updateOrderStatus(orderId, newStatus, role) {
  const allowed = ['processing', 'ready', 'completed', 'cancelled'];
  if (!allowed.includes(newStatus)) throw new Error('Invalid status.');

  const transitions = {
    pending: ['processing', 'cancelled'],
    processing: ['ready', 'cancelled'],
    ready: ['completed']
  };

  if (isSupabaseConfigured) {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!order) throw new Error('Order not found.');

    if (!(transitions[order.status] || []).includes(newStatus)) {
      throw new Error('That status transition is not allowed.');
    }

    if (newStatus === 'cancelled') {
      const { data: items } = await supabase.from('order_items').select('material_id, quantity').eq('order_id', orderId);
      for (const item of items || []) {
        const { data: comp } = await supabase.from('components').select('stock').eq('id', item.material_id).single();
        if (comp) {
          await supabase.from('components').update({ stock: comp.stock + item.quantity }).eq('id', item.material_id);
        }
      }
    }

    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    return { message: 'Order status updated.' };
  }

  sqliteDb.exec('BEGIN');
  try {
    const order = sqliteDb.prepare('SELECT status FROM orders WHERE id = ?').get(orderId);
    if (!order) throw new Error('Order not found.');

    if (!(transitions[order.status] || []).includes(newStatus)) {
      throw new Error('That status change is not allowed.');
    }

    if (newStatus === 'cancelled') {
      const items = sqliteDb.prepare('SELECT material_id, quantity FROM order_items WHERE order_id = ?').all(orderId);
      const restoreStmt = sqliteDb.prepare('UPDATE components SET stock = stock + ? WHERE id = ?');
      for (const item of items) {
        restoreStmt.run(item.quantity, item.material_id);
      }
    }

    sqliteDb.prepare('UPDATE orders SET status = ? WHERE id = ?').run(newStatus, orderId);
    sqliteDb.exec('COMMIT');
    return { message: 'Order status updated.' };
  } catch (err) {
    sqliteDb.exec('ROLLBACK');
    throw err;
  }
}

// ---------------------------------------------------------------------------
// CATALOG QUERIES
// ---------------------------------------------------------------------------

async function getCatalogData(isAdmin = false) {
  if (isSupabaseConfigured) {
    let prodQuery = supabase.from('products').select('*');
    if (!isAdmin) prodQuery = prodQuery.eq('active', 1);
    const { data: products } = await prodQuery.order('active', { ascending: false }).order('name');

    let compQuery = supabase.from('components').select('*');
    if (!isAdmin) compQuery = compQuery.eq('active', 1);
    const { data: components } = await compQuery.order('active', { ascending: false }).order('name');

    const formattedProducts = await Promise.all((products || []).map(async prod => {
      const { data: bom } = await supabase
        .from('bom_versions')
        .select('id, version, notes, created_at')
        .eq('product_id', prod.id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!bom) return { ...prod, bom: null };

      const { data: items } = await supabase
        .from('bom_items')
        .select('component_id, quantity_milli, components(code, name, unit, estimated_unit_cost_cents, cost_is_estimate)')
        .eq('bom_version_id', bom.id);

      let estimatedMaterialCost = 0;
      const formattedItems = (items || []).map(item => {
        const unitCost = item.components?.estimated_unit_cost_cents;
        const lineCost = unitCost !== null && unitCost !== undefined
          ? Math.floor((unitCost * item.quantity_milli + 500) / 1000)
          : null;
        if (lineCost) estimatedMaterialCost += lineCost;
        return {
          component_id: item.component_id,
          code: item.components?.code,
          name: item.components?.name,
          unit: item.components?.unit,
          estimated_unit_cost_cents: unitCost,
          cost_is_estimate: item.components?.cost_is_estimate,
          quantity_milli: item.quantity_milli,
          estimated_line_cost_cents: lineCost
        };
      });

      return {
        ...prod,
        bom: {
          id: bom.id,
          version: bom.version,
          notes: bom.notes,
          created_at: bom.created_at,
          items: formattedItems,
          estimated_material_cost_cents: estimatedMaterialCost
        }
      };
    }));

    return { products: formattedProducts, components: components || [] };
  }

  // SQLite mode
  const productSql = `
    SELECT id, sku, name, product_type, description, sale_price_cents,
           estimated_unit_cost_cents, cost_is_estimate, active
    FROM products ${isAdmin ? '' : 'WHERE active = 1'}
    ORDER BY active DESC, name
  `;
  const products = sqliteDb.prepare(productSql).all();

  const bomStmt = sqliteDb.prepare('SELECT id, version, notes, created_at FROM bom_versions WHERE product_id = ? ORDER BY version DESC LIMIT 1');
  const itemsStmt = sqliteDb.prepare(`
    SELECT bi.component_id, c.code, c.name, c.unit, c.estimated_unit_cost_cents,
           c.cost_is_estimate, bi.quantity_milli
    FROM bom_items bi JOIN components c ON c.id = bi.component_id
    WHERE bi.bom_version_id = ? ORDER BY c.name
  `);

  for (const prod of products) {
    const bom = bomStmt.get(prod.id);
    if (!bom) {
      prod.bom = null;
      continue;
    }
    const items = itemsStmt.all(bom.id);
    let estCost = 0;
    for (const item of items) {
      item.estimated_line_cost_cents = item.estimated_unit_cost_cents !== null
        ? Math.floor((item.estimated_unit_cost_cents * item.quantity_milli + 500) / 1000)
        : null;
      if (item.estimated_line_cost_cents) estCost += item.estimated_line_cost_cents;
    }
    prod.bom = {
      id: bom.id,
      version: bom.version,
      notes: bom.notes,
      created_at: bom.created_at,
      items,
      estimated_material_cost_cents: estCost
    };
  }

  const compSql = `
    SELECT id, code, name, description, unit, stock, price_cents, low_stock_at,
           estimated_unit_cost_cents, cost_is_estimate, orderable, active
    FROM components ${isAdmin ? '' : 'WHERE active = 1'}
    ORDER BY active DESC, name
  `;
  const components = sqliteDb.prepare(compSql).all();

  return { products, components };
}

async function getUsers() {
  if (isSupabaseConfigured) {
    const { data: users } = await supabase
      .from('users')
      .select('id, username, display_name, active, created_at, roles(role_key, name)')
      .is('deleted_at', null)
      .order('active', { ascending: false })
      .order('username');

    return (users || []).map(u => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      role_key: u.roles?.role_key,
      role_name: u.roles?.name,
      active: u.active,
      created_at: u.created_at
    }));
  }

  return sqliteDb.prepare(`
    SELECT u.id, u.username, u.display_name, r.role_key, r.name AS role_name, u.active, u.created_at
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.deleted_at IS NULL ORDER BY u.active DESC, u.username
  `).all();
}

module.exports = {
  isSupabaseConfigured,
  supabase,
  getUserByUsername,
  getUserById,
  getDashboardData,
  cartAdd,
  cartRemove,
  restock,
  checkout,
  updateOrderStatus,
  getCatalogData,
  getUsers
};
