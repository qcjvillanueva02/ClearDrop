CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    role_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
    ON users(google_sub) WHERE google_sub IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
    ON users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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
CREATE TABLE IF NOT EXISTS bom_versions (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    version INTEGER NOT NULL CHECK (version > 0),
    notes TEXT NOT NULL DEFAULT '',
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, version)
);
CREATE TABLE IF NOT EXISTS bom_items (
    bom_version_id BIGINT NOT NULL REFERENCES bom_versions(id),
    component_id BIGINT NOT NULL REFERENCES components(id),
    quantity_milli INTEGER NOT NULL CHECK (quantity_milli > 0),
    PRIMARY KEY (bom_version_id, component_id)
);
CREATE OR REPLACE FUNCTION cleardrop_reject_bom_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'BOM versions and items are immutable; create a new version.';
END;
$$;
DROP TRIGGER IF EXISTS bom_versions_no_update ON bom_versions;
CREATE TRIGGER bom_versions_no_update BEFORE UPDATE OR DELETE ON bom_versions
    FOR EACH ROW EXECUTE FUNCTION cleardrop_reject_bom_mutation();
DROP TRIGGER IF EXISTS bom_items_no_update ON bom_items;
CREATE TRIGGER bom_items_no_update BEFORE UPDATE OR DELETE ON bom_items
    FOR EACH ROW EXECUTE FUNCTION cleardrop_reject_bom_mutation();

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id),
    entity_type TEXT NOT NULL,
    entity_id BIGINT,
    action TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    contact TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total_cents INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
    order_id BIGINT NOT NULL REFERENCES orders(id),
    material_id BIGINT NOT NULL REFERENCES components(id),
    material_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_cents INTEGER NOT NULL,
    PRIMARY KEY (order_id, material_id)
);
CREATE TABLE IF NOT EXISTS order_reservations (
    username TEXT NOT NULL,
    material_id BIGINT NOT NULL REFERENCES components(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (username, material_id)
);
CREATE TABLE IF NOT EXISTS app_sessions (
    session_id TEXT PRIMARY KEY,
    session_data TEXT NOT NULL,
    expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_components_active_name ON components(active, name);
CREATE INDEX IF NOT EXISTS idx_products_active_name ON products(active, name);
CREATE INDEX IF NOT EXISTS idx_bom_versions_product ON bom_versions(product_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at);
