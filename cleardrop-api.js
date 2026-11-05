/**
 * ClearDrop Universal API & Client-Side Store
 *
 * Provides a unified API client that automatically detects whether a live PHP backend
 * is available (local php -S, Docker, or Vercel). If no backend is reachable (e.g. when hosted
 * statically on GitHub Pages or previewed locally without PHP), it seamlessly falls back
 * to a full-featured, localStorage-persisted client-side database.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'cleardrop_data_v2';
  const SESSION_KEY = 'cleardrop_session_v2';

  // Seed data matching database.php exactly
  const INITIAL_ROLES = [
    { id: 1, role_key: 'admin', name: 'Admin / Owner', description: 'Full access to users, catalog, and configuration.' },
    { id: 2, role_key: 'inventory', name: 'Inventory & Purchasing', description: 'Component stock, suppliers, purchasing, receiving, and quality.' },
    { id: 3, role_key: 'production', name: 'Production / Assembler', description: 'Production runs, component consumption, and serial tracking.' },
    { id: 4, role_key: 'sales', name: 'Sales & Orders', description: 'Quotations, orders, customer payments, and delivery.' },
    { id: 5, role_key: 'partner', name: 'Partner / Customer', description: 'Partner and household ordering and order tracking.' },
    { id: 6, role_key: 'distributor', name: 'Community Distributor', description: 'Field distributions and community demo records.' },
    { id: 7, role_key: 'customer', name: 'Demo Customer', description: 'Customer ordering in the classroom demo.' }
  ];

  const INITIAL_USERS = [
    { id: 1, username: 'clearadmin', display_name: 'ClearDrop Demo Admin', password: 'stock123', role_id: 1, role_key: 'admin', active: 1 },
    { id: 2, username: 'clearinventory', display_name: 'Demo Inventory Staff', password: 'inventory123', role_id: 2, role_key: 'inventory', active: 1 },
    { id: 3, username: 'clearproduction', display_name: 'Demo Production Staff', password: 'production123', role_id: 3, role_key: 'production', active: 1 },
    { id: 4, username: 'clearsales', display_name: 'Demo Sales Staff', password: 'sales123', role_id: 4, role_key: 'sales', active: 1 },
    { id: 5, username: 'clearpartner', display_name: 'Sample Barangay A Partner', password: 'partner123', role_id: 5, role_key: 'partner', active: 1 },
    { id: 6, username: 'cleardistributor', display_name: 'Demo Community Distributor', password: 'distributor123', role_id: 6, role_key: 'distributor', active: 1 },
    { id: 7, username: 'clear2026', display_name: 'Demo Household Customer', password: 'drop123', role_id: 7, role_key: 'customer', active: 1 }
  ];

  const INITIAL_COMPONENTS = [
    { id: 1, code: 'CLD-MESH-001', name: 'Intake screen mesh', description: 'Washable screen for leaves and coarse debris.', unit: 'piece', stock: 24, price_cents: 8500, estimated_unit_cost_cents: 2000, cost_is_estimate: 1, orderable: 1, active: 1, low_stock_at: 5 },
    { id: 2, code: 'CLD-GRAVEL-001', name: 'Washed filter gravel', description: 'Clean graded gravel; the component is stocked in 10 kg bags.', unit: '10 kg bag', stock: 18, price_cents: 12500, estimated_unit_cost_cents: 30000, cost_is_estimate: 1, orderable: 1, active: 1, low_stock_at: 5 },
    { id: 3, code: 'CLD-SAND-001', name: 'Fine filter sand', description: 'Washed fine sand; the component is stocked in 10 kg bags.', unit: '10 kg bag', stock: 20, price_cents: 16000, estimated_unit_cost_cents: 45000, cost_is_estimate: 1, orderable: 1, active: 1, low_stock_at: 5 },
    { id: 4, code: 'CLD-CARBON-001', name: 'Activated coconut carbon', description: 'Replaceable coconut-shell carbon media, stocked in 1 kg bags.', unit: '1 kg bag', stock: 12, price_cents: 28500, estimated_unit_cost_cents: 10000, cost_is_estimate: 1, orderable: 1, active: 1, low_stock_at: 5 },
    { id: 5, code: 'CLD-CERAMIC-001', name: 'Ceramic filter candle', description: 'Replaceable ceramic filter element; verify its rated specification.', unit: 'piece', stock: 8, price_cents: 65000, estimated_unit_cost_cents: 15000, cost_is_estimate: 1, orderable: 1, active: 1, low_stock_at: 5 },
    { id: 6, code: 'CLD-TANK-001', name: 'Covered HDPE water tank', description: 'Covered container used as the concept storage reservoir.', unit: 'piece', stock: 7, price_cents: 92000, estimated_unit_cost_cents: 0, cost_is_estimate: 1, orderable: 1, active: 1, low_stock_at: 5 },
    { id: 7, code: 'CLD-FAUCET-001', name: 'Food-grade outlet tap', description: 'Tap for dispensing stored filtered water.', unit: 'piece', stock: 15, price_cents: 13500, estimated_unit_cost_cents: 6500, cost_is_estimate: 1, orderable: 1, active: 1, low_stock_at: 5 },
    { id: 8, code: 'CLD-SEAL-001', name: 'Food-grade gasket set', description: 'Replacement seals for joints, lid, and outlet.', unit: 'set', stock: 22, price_cents: 7500, estimated_unit_cost_cents: 3500, cost_is_estimate: 1, orderable: 1, active: 1, low_stock_at: 5 },
    { id: 9, code: 'CD-COMP-BUCKET-001', name: '20 L HDPE bucket', description: 'Food-grade bucket; two buckets per filter unit (estimate).', unit: 'piece', stock: 50, price_cents: 0, estimated_unit_cost_cents: 27500, cost_is_estimate: 1, orderable: 0, active: 1, low_stock_at: 5 },
    { id: 10, code: 'CD-COMP-LID-001', name: 'HDPE lid with handle', description: 'Lid and handle for the two-bucket assembly (estimate).', unit: 'piece', stock: 40, price_cents: 0, estimated_unit_cost_cents: 8000, cost_is_estimate: 1, orderable: 0, active: 1, low_stock_at: 5 },
    { id: 11, code: 'CD-COMP-COTTON-001', name: 'Cotton mesh pre-filter', description: 'Washable coarse pre-filter (estimate).', unit: 'piece', stock: 60, price_cents: 0, estimated_unit_cost_cents: 2000, cost_is_estimate: 1, orderable: 0, active: 1, low_stock_at: 5 },
    { id: 12, code: 'CD-COMP-STAND-001', name: 'Filter base stand', description: 'Support stand; final specification to be confirmed (estimate).', unit: 'piece', stock: 12, price_cents: 0, estimated_unit_cost_cents: 6000, cost_is_estimate: 1, orderable: 0, active: 1, low_stock_at: 5 },
    { id: 13, code: 'CD-COMP-GUIDE-001', name: 'Printed pictogram cleaning guide', description: 'Printed cleaning and maintenance guide (estimate).', unit: 'piece', stock: 100, price_cents: 0, estimated_unit_cost_cents: 2000, cost_is_estimate: 1, orderable: 0, active: 1, low_stock_at: 5 },
    { id: 14, code: 'CD-COMP-PACK-001', name: 'Packaging set', description: 'Packaging materials (estimate).', unit: 'set', stock: 100, price_cents: 0, estimated_unit_cost_cents: 16000, cost_is_estimate: 1, orderable: 0, active: 1, low_stock_at: 5 }
  ];

  const INITIAL_PRODUCTS = [
    {
      id: 1,
      sku: 'CD-UNIT-001',
      name: 'ClearDrop Gravity Filter Unit',
      product_type: 'finished_good',
      description: 'Two-bucket, electricity-free gravity-filter concept. Estimated production cost: PHP 2,750; estimated materials: PHP 1,450; labor: PHP 450; manufacturing: PHP 300; packaging: PHP 150; transportation: PHP 150; other: PHP 250.',
      sale_price_cents: 350000,
      estimated_unit_cost_cents: 275000,
      cost_is_estimate: 1,
      active: 1,
      bom_versions: [
        {
          id: 1,
          version: 1,
          notes: 'Initial planning estimate; validate quantities against the prototype.',
          items: [
            { component_code: 'CD-COMP-BUCKET-001', quantity_milli: 2000 },
            { component_code: 'CD-COMP-LID-001', quantity_milli: 1000 },
            { component_code: 'CD-COMP-COTTON-001', quantity_milli: 1000 },
            { component_code: 'CLD-SAND-001', quantity_milli: 100 },
            { component_code: 'CLD-GRAVEL-001', quantity_milli: 50 },
            { component_code: 'CLD-CERAMIC-001', quantity_milli: 2000 },
            { component_code: 'CLD-CARBON-001', quantity_milli: 1000 },
            { component_code: 'CLD-SEAL-001', quantity_milli: 1000 },
            { component_code: 'CLD-FAUCET-001', quantity_milli: 1000 },
            { component_code: 'CD-COMP-STAND-001', quantity_milli: 1000 },
            { component_code: 'CD-COMP-GUIDE-001', quantity_milli: 1000 },
            { component_code: 'CD-COMP-PACK-001', quantity_milli: 1000 }
          ]
        }
      ]
    },
    {
      id: 2,
      sku: 'CD-CART-001',
      name: 'Replacement Cartridge Set',
      product_type: 'cartridge',
      description: 'Replacement set assumption for planning: two ceramic candles and one carbon stage. Price and cost are estimates pending prototype and supplier validation.',
      sale_price_cents: 50000,
      estimated_unit_cost_cents: 40000,
      cost_is_estimate: 1,
      active: 1,
      bom_versions: [
        {
          id: 2,
          version: 1,
          notes: 'Standard dual-stage ceramic and activated carbon media replacement set.',
          items: [
            { component_code: 'CLD-CERAMIC-001', quantity_milli: 2000 },
            { component_code: 'CLD-CARBON-001', quantity_milli: 1000 }
          ]
        }
      ]
    }
  ];

  const INITIAL_ORDERS = [
    {
      id: 1001,
      username: 'clear2026',
      customer_name: 'Barangay Health Center',
      contact: '0917-555-0199',
      status: 'processing',
      total_cents: 35000,
      created_at: '2026-10-22 14:30:00',
      items: [
        { material_id: 1, name: 'Intake screen mesh', unit: 'piece', quantity: 2, price_cents: 8500 },
        { material_id: 3, name: 'Fine filter sand', unit: '10 kg bag', quantity: 1, price_cents: 16000 }
      ]
    }
  ];

  class ClientDatabase {
    constructor() {
      this.init();
    }

    init(forceReset = false) {
      if (forceReset || !localStorage.getItem(STORAGE_KEY)) {
        this.data = {
          roles: JSON.parse(JSON.stringify(INITIAL_ROLES)),
          users: JSON.parse(JSON.stringify(INITIAL_USERS)),
          components: JSON.parse(JSON.stringify(INITIAL_COMPONENTS)),
          products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
          orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
          reservations: {}, // username -> [ { materialId, quantity } ]
          nextOrderId: 1002,
          nextUserId: 8,
          nextComponentId: 15,
          nextProductId: 3,
          nextBomId: 3
        };
        this.save();
      } else {
        try {
          this.data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        } catch {
          this.init(true);
        }
      }
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (err) {
        console.warn('Failed to persist ClearDrop store to localStorage', err);
      }
    }

    getCurrentUser() {
      try {
        const stored = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        const user = this.data.users.find(u => u.username.toLowerCase() === parsed.username.toLowerCase() && u.active);
        return user ? { username: user.username, displayName: user.display_name, role: user.role_key } : null;
      } catch {
        return null;
      }
    }

    setCurrentUser(user) {
      if (!user) {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
      } else {
        const data = JSON.stringify({ username: user.username, displayName: user.display_name, role: user.role_key });
        sessionStorage.setItem(SESSION_KEY, data);
        localStorage.setItem(SESSION_KEY, data);
      }
    }

    login(username, password) {
      const u = this.data.users.find(item => item.username.toLowerCase() === username.trim().toLowerCase());
      if (!u || !u.active) throw new Error('Invalid username or password.');
      if (u.password !== password) throw new Error('Invalid username or password.');
      const userObj = { username: u.username, displayName: u.display_name, role: u.role_key };
      this.setCurrentUser(u);
      return { authenticated: true, ...userObj };
    }

    logout() {
      this.setCurrentUser(null);
      return { message: 'Logged out successfully.' };
    }

    getDashboard(username, role) {
      const materials = this.data.components
        .filter(c => c.active && c.orderable)
        .map(c => ({
          id: c.id,
          code: c.code,
          name: c.name,
          description: c.description,
          unit: c.unit,
          stock: c.stock,
          price_cents: c.price_cents,
          low_stock_at: c.low_stock_at
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const userCart = (this.data.reservations[username] || []).map(entry => {
        const comp = this.data.components.find(c => c.id === entry.materialId);
        return {
          id: entry.materialId,
          code: comp?.code || '',
          name: comp?.name || 'Unknown',
          unit: comp?.unit || 'unit',
          quantity: entry.quantity,
          price_cents: comp?.price_cents || 0
        };
      });

      const orders = (role === 'admin'
        ? this.data.orders
        : this.data.orders.filter(o => o.username === username)
      ).slice().sort((a, b) => b.id - a.id);

      return { materials, cart: userCart, orders, role };
    }

    cartAdd(username, code) {
      const comp = this.data.components.find(c => c.code.toUpperCase() === code.trim().toUpperCase() && c.active && c.orderable);
      if (!comp) throw new Error(`Material with code "${code}" was not found or is unavailable.`);
      if (comp.stock < 1) throw new Error(`"${comp.name}" is currently out of stock.`);

      comp.stock -= 1;
      if (!this.data.reservations[username]) this.data.reservations[username] = [];
      const userRes = this.data.reservations[username];
      const existing = userRes.find(r => r.materialId === comp.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        userRes.push({ materialId: comp.id, quantity: 1 });
      }
      this.save();
      return { message: `Reserved 1 unit of ${comp.name}.` };
    }

    cartRemove(username, materialId) {
      const userRes = this.data.reservations[username] || [];
      const index = userRes.findIndex(r => r.materialId === materialId);
      if (index === -1) throw new Error('Item not in basket.');

      const comp = this.data.components.find(c => c.id === materialId);
      if (comp) comp.stock += 1;

      userRes[index].quantity -= 1;
      if (userRes[index].quantity <= 0) {
        userRes.splice(index, 1);
      }
      this.save();
      return { message: 'One unit returned to available stock.' };
    }

    checkout(username, customerName, contact) {
      const userRes = this.data.reservations[username] || [];
      if (!userRes.length) throw new Error('Your material basket is empty.');
      if (!customerName || !contact) throw new Error('Customer name and contact details are required.');

      let totalCents = 0;
      const items = userRes.map(entry => {
        const comp = this.data.components.find(c => c.id === entry.materialId);
        const itemTotal = (comp ? comp.price_cents : 0) * entry.quantity;
        totalCents += itemTotal;
        return {
          material_id: entry.materialId,
          name: comp ? comp.name : 'Unknown item',
          unit: comp ? comp.unit : 'unit',
          quantity: entry.quantity,
          price_cents: comp ? comp.price_cents : 0
        };
      });

      const orderId = this.data.nextOrderId++;
      const now = new Date();
      const createdAt = now.toISOString().replace('T', ' ').substring(0, 19);

      const newOrder = {
        id: orderId,
        username,
        customer_name: customerName.trim(),
        contact: contact.trim(),
        status: 'pending',
        total_cents: totalCents,
        created_at: createdAt,
        items
      };

      this.data.orders.unshift(newOrder);
      this.data.reservations[username] = [];
      this.save();
      return { message: 'Order submitted successfully.', orderId };
    }

    updateOrderStatus(orderId, status) {
      const order = this.data.orders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found.');
      const allowed = ['pending', 'processing', 'ready', 'completed', 'cancelled'];
      if (!allowed.includes(status)) throw new Error('Invalid order status.');

      if (status === 'cancelled' && order.status !== 'cancelled') {
        order.items.forEach(item => {
          const comp = this.data.components.find(c => c.id === item.material_id);
          if (comp) comp.stock += item.quantity;
        });
      }
      order.status = status;
      this.save();
      return { message: `Order #${orderId} marked as ${status}.` };
    }

    restock(materialId, quantity) {
      const comp = this.data.components.find(c => c.id === materialId);
      if (!comp) throw new Error('Component not found.');
      const addQty = Math.max(1, Number(quantity) || 1);
      comp.stock += addQty;
      this.save();
      return { message: `Updated stock for ${comp.name}. Current stock: ${comp.stock}.` };
    }

    getCatalog() {
      const products = this.data.products.map(p => {
        const latestBom = p.bom_versions?.slice().sort((a, b) => b.version - a.version)[0];
        let bom = null;
        if (latestBom) {
          let estimatedMaterialCost = 0;
          const items = latestBom.items.map(item => {
            const comp = this.data.components.find(c => c.code === item.component_code);
            const cost = comp?.estimated_unit_cost_cents || 0;
            const lineCost = Math.round((cost * item.quantity_milli) / 1000);
            estimatedMaterialCost += lineCost;
            return {
              component_id: comp ? comp.id : 0,
              code: item.component_code,
              name: comp ? comp.name : 'Unknown',
              unit: comp ? comp.unit : 'unit',
              quantity_milli: item.quantity_milli,
              estimated_unit_cost_cents: cost
            };
          });
          bom = {
            id: latestBom.id,
            version: latestBom.version,
            notes: latestBom.notes,
            estimated_material_cost_cents: estimatedMaterialCost,
            items
          };
        }
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          product_type: p.product_type,
          description: p.description,
          sale_price_cents: p.sale_price_cents,
          estimated_unit_cost_cents: p.estimated_unit_cost_cents,
          cost_is_estimate: p.cost_is_estimate,
          active: p.active,
          bom
        };
      });

      const components = this.data.components.slice().sort((a, b) => a.code.localeCompare(b.code));
      return { products, components };
    }

    getUsers() {
      return {
        users: this.data.users.map(u => ({
          id: u.id,
          username: u.username,
          display_name: u.display_name,
          role_key: u.role_key,
          role_name: this.data.roles.find(r => r.role_key === u.role_key)?.name || u.role_key,
          active: u.active
        }))
      };
    }

    saveProduct(payload) {
      if (!payload.sku || !payload.name) throw new Error('Product SKU and name are required.');
      if (payload.id) {
        const product = this.data.products.find(p => p.id === payload.id);
        if (!product) throw new Error('Product not found.');
        product.sku = payload.sku;
        product.name = payload.name;
        product.product_type = payload.productType;
        product.description = payload.description || '';
        product.sale_price_cents = payload.salePriceCents;
        product.estimated_unit_cost_cents = payload.estimatedCostCents;
        product.cost_is_estimate = payload.costIsEstimate ? 1 : 0;
        product.active = payload.active ? 1 : 0;
      } else {
        const newProduct = {
          id: this.data.nextProductId++,
          sku: payload.sku,
          name: payload.name,
          product_type: payload.productType,
          description: payload.description || '',
          sale_price_cents: payload.salePriceCents,
          estimated_unit_cost_cents: payload.estimatedCostCents,
          cost_is_estimate: payload.costIsEstimate ? 1 : 0,
          active: payload.active ? 1 : 0,
          bom_versions: []
        };
        this.data.products.push(newProduct);
      }
      this.save();
      return { message: 'Product saved successfully.' };
    }

    saveComponent(payload) {
      if (!payload.code || !payload.name || !payload.unit) throw new Error('Component code, name, and unit are required.');
      if (payload.id) {
        const comp = this.data.components.find(c => c.id === payload.id);
        if (!comp) throw new Error('Component not found.');
        comp.code = payload.code;
        comp.name = payload.name;
        comp.description = payload.description || '';
        comp.unit = payload.unit;
        comp.estimated_unit_cost_cents = payload.estimatedUnitCostCents;
        comp.price_cents = payload.priceCents;
        comp.low_stock_at = payload.lowStockAt;
        comp.orderable = payload.orderable ? 1 : 0;
        comp.active = payload.active ? 1 : 0;
      } else {
        const newComp = {
          id: this.data.nextComponentId++,
          code: payload.code,
          name: payload.name,
          description: payload.description || '',
          unit: payload.unit,
          stock: 0,
          price_cents: payload.priceCents,
          low_stock_at: payload.lowStockAt,
          estimated_unit_cost_cents: payload.estimatedUnitCostCents,
          cost_is_estimate: 1,
          orderable: payload.orderable ? 1 : 0,
          active: payload.active ? 1 : 0
        };
        this.data.components.push(newComp);
      }
      this.save();
      return { message: 'Component saved successfully.' };
    }

    saveBom(productId, notes, items) {
      const product = this.data.products.find(p => p.id === productId);
      if (!product) throw new Error('Product not found.');
      if (!items || !items.length) throw new Error('A BOM must contain at least one component.');

      const currentVer = (product.bom_versions || []).reduce((max, b) => Math.max(max, b.version), 0);
      const newVersionNum = currentVer + 1;

      const bomItems = items.map(it => {
        const comp = this.data.components.find(c => c.id === it.componentId);
        if (!comp) throw new Error(`Component ID ${it.componentId} not found.`);
        return {
          component_code: comp.code,
          quantity_milli: it.quantityMilli
        };
      });

      const newBom = {
        id: this.data.nextBomId++,
        version: newVersionNum,
        notes: notes || '',
        items: bomItems
      };

      if (!product.bom_versions) product.bom_versions = [];
      product.bom_versions.push(newBom);
      this.save();
      return { message: 'New BOM version recorded.', version: newVersionNum, productId };
    }

    createUser(username, displayName, roleKey, password) {
      if (!username || !displayName || !password) throw new Error('All user fields are required.');
      if (this.data.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
        throw new Error('A user with that username already exists.');
      }
      const role = this.data.roles.find(r => r.role_key === roleKey);
      if (!role) throw new Error('Invalid role.');

      const newUser = {
        id: this.data.nextUserId++,
        username: username.trim(),
        display_name: displayName.trim(),
        password,
        role_id: role.id,
        role_key: role.role_key,
        active: 1
      };
      this.data.users.push(newUser);
      this.save();
      return { message: `Created demo user "${username}".` };
    }

    updateUserRole(userId, newRoleKey) {
      const user = this.data.users.find(u => u.id === userId);
      if (!user) throw new Error('User not found.');
      const role = this.data.roles.find(r => r.role_key === newRoleKey);
      if (!role) throw new Error('Invalid role.');
      user.role_id = role.id;
      user.role_key = role.role_key;
      this.save();
      return { message: `Updated role for ${user.username} to ${role.name}.` };
    }

    deactivateUser(userId) {
      const user = this.data.users.find(u => u.id === userId);
      if (!user) throw new Error('User not found.');
      user.active = 0;
      this.save();
      return { message: `Account "${user.username}" deactivated.` };
    }
  }

  // Unified API Client instance
  const db = new ClientDatabase();
  let backendMode = 'detecting'; // 'php' or 'client'
  let detectionPromise = null;
  const modeListeners = [];

  function notifyMode(mode) {
    backendMode = mode;
    modeListeners.forEach(fn => {
      try { fn(mode); } catch (e) { console.error(e); }
    });
  }

  async function detectBackend() {
    if (detectionPromise) return detectionPromise;
    detectionPromise = (async () => {
      // Force client-side mode if file protocol or hosted on GitHub Pages or static host
      const isGithub = window.location.hostname.endsWith('github.io');
      const isFile = window.location.protocol === 'file:';
      if (isGithub || isFile) {
        notifyMode('client');
        return 'client';
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('auth.php?action=status', {
          method: 'GET',
          credentials: 'same-origin',
          signal: controller.signal
        });
        clearTimeout(timer);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          notifyMode('php');
          return 'php';
        }
      } catch {}

      notifyMode('client');
      return 'client';
    })();
    return detectionPromise;
  }

  window.ClearDropAPI = {
    detectBackend,
    getMode: () => backendMode,
    onModeChange: fn => modeListeners.push(fn),
    resetDemoData: () => {
      db.init(true);
      window.location.reload();
    },

    async requestAuth(action, username, password) {
      const mode = await detectBackend();
      if (mode === 'php') {
        const options = { method: action === 'status' ? 'GET' : 'POST', credentials: 'same-origin' };
        if (action !== 'status') {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify(action === 'google_login'
            ? { action, credential: username }
            : { action, username, password });
        }
        const response = await fetch(`auth.php${action === 'status' ? '?action=status' : ''}`, options);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Login request failed.');
        return result;
      }

      // Standalone client mode
      if (action === 'status') {
        const current = db.getCurrentUser();
        return current ? { authenticated: true, ...current } : { authenticated: false };
      }
      if (action === 'login') {
        return db.login(username, password);
      }
      if (action === 'logout') {
        return db.logout();
      }
      if (action === 'google_login') {
        throw new Error('Google Sign-In requires a live server with OAuth client credentials. Please use demo accounts.');
      }
      throw new Error(`Unknown auth action "${action}".`);
    },

    async getGoogleConfig() {
      const mode = await detectBackend();
      if (mode === 'php') {
        try {
          const res = await fetch('auth.php?action=google_config', { credentials: 'same-origin', cache: 'no-store' });
          if (!res.ok) return { enabled: false, message: 'Google OAuth not active on server.' };
          return await res.json();
        } catch {
          return { enabled: false, message: 'Google sign-in unavailable in offline mode.' };
        }
      }
      return {
        enabled: false,
        message: 'GitHub Pages Demo Mode: Google OAuth requires live server backend. Sign in with demo credentials below.'
      };
    },

    async requestInventory(action, payload) {
      const mode = await detectBackend();
      if (mode === 'php') {
        const options = { method: payload ? 'POST' : 'GET', credentials: 'same-origin' };
        if (payload) {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify({ action, ...payload });
        }
        const response = await fetch(`inventory-api.php${payload ? '' : '?action=dashboard'}`, options);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Inventory request failed.');
        return result;
      }

      // Client mode
      const user = db.getCurrentUser();
      if (!user) throw new Error('Please sign in to access inventory.');

      if (action === 'dashboard') {
        return db.getDashboard(user.username, user.role);
      }
      if (action === 'cart_add') {
        return db.cartAdd(user.username, payload.code);
      }
      if (action === 'cart_remove') {
        return db.cartRemove(user.username, payload.materialId);
      }
      if (action === 'checkout') {
        return db.checkout(user.username, payload.customerName, payload.contact);
      }
      if (action === 'order_status') {
        return db.updateOrderStatus(payload.orderId, payload.status);
      }
      if (action === 'restock') {
        return db.restock(payload.materialId, payload.quantity);
      }
      throw new Error(`Unknown inventory action "${action}".`);
    },

    async requestCatalog(action, payload) {
      const mode = await detectBackend();
      if (mode === 'php') {
        const options = { method: payload ? 'POST' : 'GET', credentials: 'same-origin' };
        if (payload) {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify({ action, ...payload });
        }
        const response = await fetch(`catalog-api.php${payload ? '' : `?action=${encodeURIComponent(action)}`}`, options);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.error?.message || 'Catalog request failed.');
        return result;
      }

      // Client mode
      const user = db.getCurrentUser();
      if (!user) throw new Error('Sign in required.');

      if (action === 'catalog') {
        return db.getCatalog();
      }
      if (action === 'users') {
        if (user.role !== 'admin') throw new Error('Admin role required.');
        return db.getUsers();
      }
      if (action === 'save_product') {
        if (user.role !== 'admin') throw new Error('Admin role required.');
        return db.saveProduct(payload);
      }
      if (action === 'save_component') {
        if (user.role !== 'admin') throw new Error('Admin role required.');
        return db.saveComponent(payload);
      }
      if (action === 'save_bom') {
        if (user.role !== 'admin') throw new Error('Admin role required.');
        return db.saveBom(payload.productId, payload.notes, payload.items);
      }
      if (action === 'create_user') {
        if (user.role !== 'admin') throw new Error('Admin role required.');
        return db.createUser(payload.username, payload.displayName, payload.role, payload.password);
      }
      if (action === 'update_user_role') {
        if (user.role !== 'admin') throw new Error('Admin role required.');
        return db.updateUserRole(payload.userId, payload.role);
      }
      if (action === 'deactivate_user') {
        if (user.role !== 'admin') throw new Error('Admin role required.');
        return db.deactivateUser(payload.userId);
      }
      throw new Error(`Unknown catalog action "${action}".`);
    }
  };

  // Immediate detection check
  detectBackend();
})();
