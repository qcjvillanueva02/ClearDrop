<?php
declare(strict_types=1);

function clearDropDatabase(): PDO
{
    static $database = null;
    if ($database instanceof PDO) {
        return $database;
    }

    $databaseUrl = getenv('DATABASE_URL');
    if ($databaseUrl !== false && trim($databaseUrl) !== '') {
        $parts = parse_url($databaseUrl);
        if (!is_array($parts) || !isset($parts['host'], $parts['path'], $parts['user'], $parts['pass'])) {
            throw new RuntimeException('DATABASE_URL must be a PostgreSQL connection URL.');
        }
        $databaseName = ltrim($parts['path'], '/');
        if ($databaseName === '') {
            throw new RuntimeException('DATABASE_URL must include a database name.');
        }
        $query = [];
        parse_str($parts['query'] ?? '', $query);
        $sslMode = (string) ($query['sslmode'] ?? 'require');
        if (!in_array($sslMode, ['require', 'verify-ca', 'verify-full'], true)) {
            $sslMode = 'require';
        }
        $dsn = sprintf(
            'pgsql:host=%s;port=%d;dbname=%s;sslmode=%s',
            $parts['host'],
            (int) ($parts['port'] ?? 5432),
            rawurldecode($databaseName),
            $sslMode
        );
        $database = new PDO($dsn, rawurldecode($parts['user']), rawurldecode($parts['pass']), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $database->query('SELECT pg_advisory_lock(1790, 1)');
        try {
            $database->exec(
                'CREATE TABLE IF NOT EXISTS cleardrop_schema_version (version INTEGER PRIMARY KEY)'
            );
            $version = (int) $database->query(
                'SELECT COALESCE(MAX(version), 0) FROM cleardrop_schema_version'
            )->fetchColumn();
            if ($version < 1) {
                $schema = file_get_contents(__DIR__ . '/database/postgres-schema.sql');
                if ($schema === false) {
                    throw new RuntimeException('The PostgreSQL schema file could not be read.');
                }
                $database->beginTransaction();
                $database->exec($schema);
                $database->exec('INSERT INTO cleardrop_schema_version (version) VALUES (1)');
                $database->commit();
            }
        } catch (Throwable $error) {
            if ($database->inTransaction()) {
                $database->rollBack();
            }
            throw $error;
        } finally {
            $database->query('SELECT pg_advisory_unlock(1790, 1)');
        }
        clearDropSeedPostgres($database);
        return $database;
    }

    if (getenv('VERCEL') !== false) {
        throw new RuntimeException('DATABASE_URL must be configured for the Vercel deployment.');
    }

    $databasePath = getenv('CLEARDROP_DB_PATH');
    if ($databasePath === false || $databasePath === '') {
        $databasePath = __DIR__ . '/cleardrop.sqlite';
    }

    $database = new PDO('sqlite:' . $databasePath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $database->exec('PRAGMA foreign_keys = ON');

    $legacyMaterials = (bool) $database->query(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'materials'"
    )->fetchColumn();
    $componentsExist = (bool) $database->query(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'components'"
    )->fetchColumn();
    if ($legacyMaterials && !$componentsExist) {
        $database->exec('ALTER TABLE materials RENAME TO components');
    }

    $database->exec(
        'CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role_key TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT NOT NULL
        )'
    );
    $database->exec(
        'CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL COLLATE NOCASE UNIQUE,
            display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            google_sub TEXT,
            email TEXT,
            auth_provider TEXT NOT NULL DEFAULT \'password\',
            role_id INTEGER NOT NULL REFERENCES roles(id),
            active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        )'
    );
    addColumnIfMissing($database, 'users', 'google_sub', 'TEXT');
    addColumnIfMissing($database, 'users', 'email', 'TEXT');
    addColumnIfMissing($database, 'users', 'auth_provider', "TEXT NOT NULL DEFAULT 'password'");
    $database->exec(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL'
    );
    $database->exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    $database->exec(
        'CREATE TABLE IF NOT EXISTS components (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        )'
    );
    addColumnIfMissing($database, 'components', 'estimated_unit_cost_cents', 'INTEGER');
    addColumnIfMissing($database, 'components', 'cost_is_estimate', 'INTEGER NOT NULL DEFAULT 1');
    addColumnIfMissing($database, 'components', 'orderable', 'INTEGER NOT NULL DEFAULT 1');
    addColumnIfMissing($database, 'components', 'active', 'INTEGER NOT NULL DEFAULT 1');
    addColumnIfMissing($database, 'components', 'created_at', "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'");
    addColumnIfMissing($database, 'components', 'updated_at', "TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'");
    addColumnIfMissing($database, 'components', 'deleted_at', 'TEXT');

    $database->exec(
        'CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            product_type TEXT NOT NULL CHECK (product_type IN (\'finished_good\', \'cartridge\')),
            description TEXT NOT NULL,
            sale_price_cents INTEGER NOT NULL CHECK (sale_price_cents >= 0),
            estimated_unit_cost_cents INTEGER CHECK (estimated_unit_cost_cents >= 0),
            cost_is_estimate INTEGER NOT NULL DEFAULT 1 CHECK (cost_is_estimate IN (0, 1)),
            active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        )'
    );
    $database->exec(
        'CREATE TABLE IF NOT EXISTS bom_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL REFERENCES products(id),
            version INTEGER NOT NULL CHECK (version > 0),
            notes TEXT NOT NULL DEFAULT \'\',
            created_by INTEGER REFERENCES users(id),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (product_id, version)
        )'
    );
    $database->exec(
        'CREATE TABLE IF NOT EXISTS bom_items (
            bom_version_id INTEGER NOT NULL REFERENCES bom_versions(id),
            component_id INTEGER NOT NULL REFERENCES components(id),
            quantity_milli INTEGER NOT NULL CHECK (quantity_milli > 0),
            PRIMARY KEY (bom_version_id, component_id)
        )'
    );
    $database->exec(
        'CREATE TRIGGER IF NOT EXISTS bom_versions_no_update
         BEFORE UPDATE ON bom_versions BEGIN
            SELECT RAISE(ABORT, \'BOM versions are immutable; create a new version.\');
         END'
    );
    $database->exec(
        'CREATE TRIGGER IF NOT EXISTS bom_versions_no_delete
         BEFORE DELETE ON bom_versions BEGIN
            SELECT RAISE(ABORT, \'BOM versions are immutable.\');
         END'
    );
    $database->exec(
        'CREATE TRIGGER IF NOT EXISTS bom_items_no_update
         BEFORE UPDATE ON bom_items BEGIN
            SELECT RAISE(ABORT, \'BOM items are immutable; create a new version.\');
         END'
    );
    $database->exec(
        'CREATE TRIGGER IF NOT EXISTS bom_items_no_delete
         BEFORE DELETE ON bom_items BEGIN
            SELECT RAISE(ABORT, \'BOM items are immutable.\');
         END'
    );
    $database->exec(
        'CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_user_id INTEGER REFERENCES users(id),
            entity_type TEXT NOT NULL,
            entity_id INTEGER,
            action TEXT NOT NULL,
            metadata_json TEXT NOT NULL DEFAULT \'{}\',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );
    $database->exec(
        'CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            contact TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT \'pending\',
            total_cents INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );
    $database->exec(
        'CREATE TABLE IF NOT EXISTS order_items (
            order_id INTEGER NOT NULL REFERENCES orders(id),
            material_id INTEGER NOT NULL REFERENCES components(id),
            material_name TEXT NOT NULL,
            unit TEXT NOT NULL,
            quantity INTEGER NOT NULL CHECK (quantity > 0),
            price_cents INTEGER NOT NULL,
            PRIMARY KEY (order_id, material_id)
        )'
    );
    $database->exec(
        'CREATE TABLE IF NOT EXISTS order_reservations (
            username TEXT NOT NULL,
            material_id INTEGER NOT NULL REFERENCES components(id),
            quantity INTEGER NOT NULL CHECK (quantity > 0),
            PRIMARY KEY (username, material_id)
        )'
    );
    $database->exec(
        'CREATE INDEX IF NOT EXISTS idx_components_active_name ON components(active, name)'
    );
    $database->exec(
        'CREATE INDEX IF NOT EXISTS idx_products_active_name ON products(active, name)'
    );
    $database->exec(
        'CREATE INDEX IF NOT EXISTS idx_bom_versions_product ON bom_versions(product_id, version DESC)'
    );
    $database->exec(
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at)'
    );

    foreach ([
        ['admin', 'Admin / Owner', 'Full access to users, catalog, and configuration.'],
        ['inventory', 'Inventory & Purchasing', 'Component stock, suppliers, purchasing, receiving, and quality.'],
        ['production', 'Production / Assembler', 'Production runs, component consumption, and serial tracking.'],
        ['sales', 'Sales & Orders', 'Quotations, orders, customer payments, and delivery.'],
        ['partner', 'Partner / Customer', 'Partner and household ordering and order tracking.'],
        ['distributor', 'Community Distributor', 'Field distributions and community demo records.'],
        ['customer', 'Demo Customer', 'Customer ordering in the classroom demo.'],
    ] as $role) {
        $database->prepare(
            'INSERT OR IGNORE INTO roles (role_key, name, description) VALUES (?, ?, ?)'
        )->execute($role);
    }

    $demoUsers = [
        ['clearadmin', 'ClearDrop Demo Admin', 'stock123', 'admin'],
        ['clearinventory', 'Demo Inventory Staff', 'inventory123', 'inventory'],
        ['clearproduction', 'Demo Production Staff', 'production123', 'production'],
        ['clearsales', 'Demo Sales Staff', 'sales123', 'sales'],
        ['clearpartner', 'Sample Barangay A Partner', 'partner123', 'partner'],
        ['cleardistributor', 'Demo Community Distributor', 'distributor123', 'distributor'],
        ['clear2026', 'Demo Household Customer', 'drop123', 'customer'],
    ];
    $findUser = $database->prepare('SELECT 1 FROM users WHERE username = ?');
    $insertUser = $database->prepare(
        'INSERT INTO users (username, display_name, password_hash, role_id)
         SELECT ?, ?, ?, id FROM roles WHERE role_key = ?'
    );
    foreach ($demoUsers as [$username, $displayName, $password, $roleKey]) {
        $findUser->execute([$username]);
        if (!$findUser->fetchColumn()) {
            $insertUser->execute([$username, $displayName, password_hash($password, PASSWORD_DEFAULT), $roleKey]);
        }
    }

    seedComponents($database);
    seedProductsAndBoms($database);

    return $database;
}

function clearDropSeedPostgres(PDO $database): void
{
    $roles = [
        ['admin', 'Admin / Owner', 'Full access to users, catalog, and configuration.'],
        ['inventory', 'Inventory & Purchasing', 'Component stock, suppliers, purchasing, receiving, and quality.'],
        ['production', 'Production / Assembler', 'Production runs, component consumption, and serial tracking.'],
        ['sales', 'Sales & Orders', 'Quotations, orders, customer payments, and delivery.'],
        ['partner', 'Partner / Customer', 'Partner and household ordering and order tracking.'],
        ['distributor', 'Community Distributor', 'Field distributions and community demo records.'],
        ['customer', 'Demo Customer', 'Customer ordering in the classroom demo.'],
    ];
    $insertRole = $database->prepare(
        'INSERT INTO roles (role_key, name, description) VALUES (?, ?, ?) ON CONFLICT(role_key) DO NOTHING'
    );
    foreach ($roles as $role) {
        $insertRole->execute($role);
    }
    seedComponents($database);
    seedProductsAndBoms($database);
}

function clearDropBeginTransaction(PDO $database): void
{
    if ($database->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql') {
        $database->beginTransaction();
        return;
    }
    $database->exec('BEGIN IMMEDIATE');
}

function clearDropLastInsertId(PDO $database): int
{
    if ($database->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql') {
        return (int) $database->query('SELECT LASTVAL()')->fetchColumn();
    }
    return (int) $database->lastInsertId();
}

function addColumnIfMissing(PDO $database, string $table, string $column, string $definition): void
{
    $columns = $database->query('PRAGMA table_info(' . $table . ')')->fetchAll();
    foreach ($columns as $existing) {
        if ($existing['name'] === $column) {
            return;
        }
    }
    $database->exec('ALTER TABLE ' . $table . ' ADD COLUMN ' . $column . ' ' . $definition);
}

function seedComponents(PDO $database): void
{
    $seeds = [
        ['CLD-MESH-001', 'Intake screen mesh', 'Washable screen for leaves and coarse debris.', 'piece', 24, 8500, 2000, 1],
        ['CLD-GRAVEL-001', 'Washed filter gravel', 'Clean graded gravel; the component is stocked in 10 kg bags.', '10 kg bag', 18, 12500, 30000, 1],
        ['CLD-SAND-001', 'Fine filter sand', 'Washed fine sand; the component is stocked in 10 kg bags.', '10 kg bag', 20, 16000, 45000, 1],
        ['CLD-CARBON-001', 'Activated coconut carbon', 'Replaceable coconut-shell carbon media, stocked in 1 kg bags.', '1 kg bag', 12, 28500, 10000, 1],
        ['CLD-CERAMIC-001', 'Ceramic filter candle', 'Replaceable ceramic filter element; verify its rated specification.', 'piece', 8, 65000, 15000, 1],
        ['CLD-TANK-001', 'Covered HDPE water tank', 'Covered container used as the concept storage reservoir.', 'piece', 7, 92000, 0, 1],
        ['CLD-FAUCET-001', 'Food-grade outlet tap', 'Tap for dispensing stored filtered water.', 'piece', 15, 13500, 6500, 1],
        ['CLD-SEAL-001', 'Food-grade gasket set', 'Replacement seals for joints, lid, and outlet.', 'set', 22, 7500, 3500, 1],
        ['CD-COMP-BUCKET-001', '20 L HDPE bucket', 'Food-grade bucket; two buckets per filter unit (estimate).', 'piece', 50, 0, 27500, 0],
        ['CD-COMP-LID-001', 'HDPE lid with handle', 'Lid and handle for the two-bucket assembly (estimate).', 'piece', 40, 0, 8000, 0],
        ['CD-COMP-COTTON-001', 'Cotton mesh pre-filter', 'Washable coarse pre-filter (estimate).', 'piece', 60, 0, 2000, 0],
        ['CD-COMP-STAND-001', 'Filter base stand', 'Support stand; final specification to be confirmed (estimate).', 'piece', 12, 0, 6000, 0],
        ['CD-COMP-GUIDE-001', 'Printed pictogram cleaning guide', 'Printed cleaning and maintenance guide (estimate).', 'piece', 100, 0, 2000, 0],
        ['CD-COMP-PACK-001', 'Packaging set', 'Packaging materials (estimate).', 'set', 100, 0, 16000, 0],
    ];
    $insert = $database->prepare(
        'INSERT INTO components
            (code, name, description, unit, stock, price_cents, estimated_unit_cost_cents, cost_is_estimate, orderable)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(code) DO NOTHING'
    );
    $updateCost = $database->prepare(
        'UPDATE components SET estimated_unit_cost_cents = ?, cost_is_estimate = 1
         WHERE code = ? AND estimated_unit_cost_cents IS NULL'
    );
    foreach ($seeds as [$code, $name, $description, $unit, $stock, $price, $estimatedCost, $orderable]) {
        $insert->execute([$code, $name, $description, $unit, $stock, $price, $estimatedCost, $orderable]);
        $updateCost->execute([$estimatedCost, $code]);
    }
}

function seedProductsAndBoms(PDO $database): void
{
    $products = [
        ['CD-UNIT-001', 'ClearDrop Gravity Filter Unit', 'finished_good',
            'Two-bucket, electricity-free gravity-filter concept. Estimated production cost: PHP 2,750; estimated materials: PHP 1,450; labor: PHP 450; manufacturing: PHP 300; packaging: PHP 150; transportation: PHP 150; other: PHP 250.',
            350000, 275000],
        ['CD-CART-001', 'Replacement Cartridge Set', 'cartridge',
            'Replacement set assumption for planning: two ceramic candles and one carbon stage. Price and cost are estimates pending prototype and supplier validation.',
            50000, 40000],
    ];
    $insertProduct = $database->prepare(
        'INSERT INTO products
            (sku, name, product_type, description, sale_price_cents, estimated_unit_cost_cents, cost_is_estimate)
         VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(sku) DO NOTHING'
    );
    foreach ($products as $product) {
        $insertProduct->execute($product);
    }

    $bomSeeds = [
        'CD-UNIT-001' => [
            ['CD-COMP-BUCKET-001', 2000],
            ['CD-COMP-LID-001', 1000],
            ['CD-COMP-COTTON-001', 1000],
            ['CLD-SAND-001', 100],
            ['CLD-GRAVEL-001', 50],
            ['CLD-CERAMIC-001', 2000],
            ['CLD-CARBON-001', 1000],
            ['CLD-SEAL-001', 1000],
            ['CLD-FAUCET-001', 1000],
            ['CD-COMP-STAND-001', 1000],
            ['CD-COMP-GUIDE-001', 1000],
            ['CD-COMP-PACK-001', 1000],
        ],
        'CD-CART-001' => [
            ['CLD-CERAMIC-001', 2000],
            ['CLD-CARBON-001', 1000],
        ],
    ];
    $findProduct = $database->prepare('SELECT id FROM products WHERE sku = ?');
    $findBom = $database->prepare('SELECT id FROM bom_versions WHERE product_id = ? ORDER BY version DESC LIMIT 1');
    $createBom = $database->prepare(
        'INSERT INTO bom_versions (product_id, version, notes) VALUES (?, 1, ?)'
    );
    $findComponent = $database->prepare('SELECT id FROM components WHERE code = ?');
    $addItem = $database->prepare(
        'INSERT INTO bom_items (bom_version_id, component_id, quantity_milli) VALUES (?, ?, ?)
         ON CONFLICT(bom_version_id, component_id) DO NOTHING'
    );
    foreach ($bomSeeds as $sku => $items) {
        $findProduct->execute([$sku]);
        $productId = (int) $findProduct->fetchColumn();
        $findBom->execute([$productId]);
        $bomVersionId = $findBom->fetchColumn();
        if (!$bomVersionId) {
            $createBom->execute([$productId, 'Initial planning estimate; validate quantities against the prototype.']);
            $bomVersionId = clearDropLastInsertId($database);
        }
        foreach ($items as [$componentCode, $quantityMilli]) {
            $findComponent->execute([$componentCode]);
            $componentId = $findComponent->fetchColumn();
            if ($componentId) {
                $addItem->execute([$bomVersionId, $componentId, $quantityMilli]);
            }
        }
    }
}

function clearDropAudit(PDO $database, ?int $actorId, string $entityType, ?int $entityId, string $action, array $metadata = []): void
{
    $database->prepare(
        'INSERT INTO audit_logs (actor_user_id, entity_type, entity_id, action, metadata_json)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([
        $actorId,
        $entityType,
        $entityId,
        $action,
        json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
    ]);
}

function clearDropCurrentUser(PDO $database): ?array
{
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    $statement = $database->prepare(
        'SELECT u.id, u.username, u.display_name, u.email, r.role_key
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? AND u.active = 1 AND u.deleted_at IS NULL'
    );
    $statement->execute([(int) $_SESSION['user_id']]);
    $user = $statement->fetch();
    if (!$user) {
        $_SESSION = [];
        return null;
    }
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role_key'];
    return $user;
}
