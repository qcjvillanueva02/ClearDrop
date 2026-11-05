-- ============================================================================
-- ClearDrop Gravity Water Filter System — Supabase PostgreSQL Schema & Seed
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ============================================================================

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    role_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    google_sub TEXT,
    email TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'password',
    role_id BIGINT NOT NULL REFERENCES roles(id),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));

-- 3. COMPONENTS TABLE
CREATE TABLE IF NOT EXISTS components (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    low_stock_at INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_at >= 0),
    estimated_unit_cost_cents INTEGER CHECK (estimated_unit_cost_cents >= 0),
    cost_is_estimate INTEGER NOT NULL DEFAULT 1 CHECK (cost_is_estimate IN (0, 1)),
    orderable INTEGER NOT NULL DEFAULT 1 CHECK (orderable IN (0, 1)),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('finished_good', 'cartridge')),
    description TEXT NOT NULL,
    sale_price_cents INTEGER NOT NULL CHECK (sale_price_cents >= 0),
    estimated_unit_cost_cents INTEGER CHECK (estimated_unit_cost_cents >= 0),
    cost_is_estimate INTEGER NOT NULL DEFAULT 1 CHECK (cost_is_estimate IN (0, 1)),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- 5. BOM VERSIONS TABLE
CREATE TABLE IF NOT EXISTS bom_versions (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    version INTEGER NOT NULL CHECK (version > 0),
    notes TEXT NOT NULL DEFAULT '',
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, version)
);

-- 6. BOM ITEMS TABLE
CREATE TABLE IF NOT EXISTS bom_items (
    bom_version_id BIGINT NOT NULL REFERENCES bom_versions(id) ON DELETE CASCADE,
    component_id BIGINT NOT NULL REFERENCES components(id),
    quantity_milli INTEGER NOT NULL CHECK (quantity_milli > 0),
    PRIMARY KEY (bom_version_id, component_id)
);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id),
    entity_type TEXT NOT NULL,
    entity_id BIGINT,
    action TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    contact TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total_cents INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    material_id BIGINT NOT NULL REFERENCES components(id),
    material_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_cents INTEGER NOT NULL,
    PRIMARY KEY (order_id, material_id)
);

-- 10. ORDER RESERVATIONS TABLE (Active Baskets)
CREATE TABLE IF NOT EXISTS order_reservations (
    username TEXT NOT NULL,
    material_id BIGINT NOT NULL REFERENCES components(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (username, material_id)
);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Roles
INSERT INTO roles (id, role_key, name, description) VALUES
    (1, 'admin', 'Admin / Owner', 'Full access to inventory, catalog, and users'),
    (2, 'inventory', 'Inventory & Purchasing', 'Manages materials and stock'),
    (3, 'production', 'Production / Assembler', 'Builds units based on BOM'),
    (4, 'sales', 'Sales & Orders', 'Manages orders and customer requests'),
    (5, 'partner', 'Partner / Customer', 'Community partner access'),
    (6, 'distributor', 'Community Distributor', 'Community distribution hub'),
    (7, 'customer', 'Demo Customer', 'Orders filter materials')
ON CONFLICT (id) DO NOTHING;

-- Demo Users (Passwords: stock manager = stock123, customer = drop123)
-- bcrypt hash for 'stock123': $2a$10$NG3MM5fijGVrK10enwlBhuRnOvsnf2DIAhyJ2JQc9d2iKDm6b5kyO
-- bcrypt hash for 'drop123':  $2a$10$MxjhhYuUTJKvvo.4nhdBkO8wtt9Kzd887SeXKYebT5uqW64mnwGJ.
INSERT INTO users (id, username, display_name, password_hash, role_id, active) VALUES
    (1, 'clearadmin', 'ClearDrop Demo Admin', '$2a$10$NG3MM5fijGVrK10enwlBhuRnOvsnf2DIAhyJ2JQc9d2iKDm6b5kyO', 1, 1),
    (2, 'clearinventory', 'Stock Controller', '$2a$10$NG3MM5fijGVrK10enwlBhuRnOvsnf2DIAhyJ2JQc9d2iKDm6b5kyO', 2, 1),
    (3, 'clearproduction', 'Assembly Lead', '$2a$10$NG3MM5fijGVrK10enwlBhuRnOvsnf2DIAhyJ2JQc9d2iKDm6b5kyO', 3, 1),
    (4, 'clearsales', 'Sales Officer', '$2a$10$NG3MM5fijGVrK10enwlBhuRnOvsnf2DIAhyJ2JQc9d2iKDm6b5kyO', 4, 1),
    (5, 'clearpartner', 'Barangay Health Partner', '$2a$10$NG3MM5fijGVrK10enwlBhuRnOvsnf2DIAhyJ2JQc9d2iKDm6b5kyO', 5, 1),
    (6, 'cleardistributor', 'Community Hub', '$2a$10$NG3MM5fijGVrK10enwlBhuRnOvsnf2DIAhyJ2JQc9d2iKDm6b5kyO', 6, 1),
    (7, 'clear2026', 'Community Resident', '$2a$10$MxjhhYuUTJKvvo.4nhdBkO8wtt9Kzd887SeXKYebT5uqW64mnwGJ.', 7, 1)
ON CONFLICT (id) DO NOTHING;

-- Components (14 core items)
INSERT INTO components (id, code, name, description, unit, stock, price_cents, low_stock_at, estimated_unit_cost_cents, cost_is_estimate, orderable, active) VALUES
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
    (14, 'CLD-LABEL-001', 'QR Maintenance Label Sheet', 'Weatherproof adhesive QR label for maintenance and ordering tracking.', 'sheet', 500, 1500, 50, 500, 1, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- Products (2 finished goods)
INSERT INTO products (id, sku, name, product_type, description, sale_price_cents, estimated_unit_cost_cents, cost_is_estimate, active) VALUES
    (1, 'CD-UNIT-001', 'ClearDrop Standard Gravity Filter Unit', 'Complete household gravity water filter system with 20L storage and 4-stage media.', 350000, 195000, 1, 1),
    (2, 'CD-CART-001', 'ClearDrop Annual Media Replacement Pack', 'Complete replacement media cartridge kit: sand, carbon, and ceramic candle.', 85000, 48000, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- BOM Versions
INSERT INTO bom_versions (id, product_id, version, notes, created_by) VALUES
    (1, 1, 1, 'Initial standard bill of materials for household gravity filter unit', 1),
    (2, 2, 1, 'Annual replacement consumables pack', 1)
ON CONFLICT (id) DO NOTHING;

-- BOM Items for Product 1 (Standard Unit)
INSERT INTO bom_items (bom_version_id, component_id, quantity_milli) VALUES
    (1, 1, 1000),  -- 1 piece mesh
    (1, 2, 3000),  -- 3 kg gravel
    (1, 3, 4000),  -- 4 kg sand
    (1, 4, 1500),  -- 1.5 kg carbon
    (1, 5, 1000),  -- 1 ceramic candle
    (1, 6, 1000),  -- 1 storage tank
    (1, 7, 1000),  -- 1 dispensing faucet
    (1, 8, 1000),  -- 1 lid gasket
    (1, 9, 1000)   -- 1 pipe set
ON CONFLICT (bom_version_id, component_id) DO NOTHING;

-- BOM Items for Product 2 (Media Pack)
INSERT INTO bom_items (bom_version_id, component_id, quantity_milli) VALUES
    (2, 3, 3000),  -- 3 kg sand
    (2, 4, 1500),  -- 1.5 kg carbon
    (2, 5, 1000)   -- 1 ceramic candle
ON CONFLICT (bom_version_id, component_id) DO NOTHING;
