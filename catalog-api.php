<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https',
    'httponly' => true,
    'samesite' => 'Lax',
]);
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/database-session-handler.php';
clearDropSessionStart();

function catalogRespond(int $status, array $payload): void
{
    http_response_code($status);
    if ($status >= 400 && !isset($payload['error'])) {
        $payload['error'] = [
            'code' => 'request_failed',
            'message' => (string) ($payload['message'] ?? 'The request could not be completed.'),
        ];
    }
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function catalogInput(): array
{
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input) || !isset($input['action']) || !is_string($input['action'])) {
        catalogRespond(400, ['message' => 'A valid JSON action is required.']);
    }
    return $input;
}

function catalogText(mixed $value, string $field): string
{
    if (!is_string($value)) {
        catalogRespond(400, ['message' => $field . ' must be text.']);
    }
    return trim($value);
}

function catalogAdmin(): void
{
    if (($_SESSION['role'] ?? '') !== 'admin') {
        catalogRespond(403, ['message' => 'Only an Admin / Owner can manage the catalog or user accounts.']);
    }
}

function centsValue(mixed $value, string $field, bool $nullable = false): ?int
{
    if ($nullable && ($value === null || $value === '')) {
        return null;
    }
    $number = filter_var($value, FILTER_VALIDATE_INT);
    if ($number === false || $number < 0 || $number > 100000000) {
        catalogRespond(400, ['message' => $field . ' must be an integer number of PHP cents from 0 to 100,000,000.']);
    }
    return $number;
}

function catalogSnapshot(PDO $database, bool $includeInactive): array
{
    $productQuery = $database->prepare(
        'SELECT id, sku, name, product_type, description, sale_price_cents,
                estimated_unit_cost_cents, cost_is_estimate, active
         FROM products WHERE active = 1 OR ? = 1 ORDER BY active DESC, name'
    );
    $productQuery->execute([$includeInactive ? 1 : 0]);
    $products = $productQuery->fetchAll();
    $bomQuery = $database->prepare(
        'SELECT b.id, b.version, b.notes, b.created_at
         FROM bom_versions b WHERE b.product_id = ? ORDER BY b.version DESC LIMIT 1'
    );
    $itemsQuery = $database->prepare(
        'SELECT bi.component_id, c.code, c.name, c.unit, c.estimated_unit_cost_cents,
                c.cost_is_estimate, bi.quantity_milli
         FROM bom_items bi JOIN components c ON c.id = bi.component_id
         WHERE bi.bom_version_id = ? ORDER BY c.name'
    );
    foreach ($products as &$product) {
        $bomQuery->execute([(int) $product['id']]);
        $bom = $bomQuery->fetch();
        $product['bom'] = null;
        if (!$bom) {
            continue;
        }
        $itemsQuery->execute([(int) $bom['id']]);
        $items = $itemsQuery->fetchAll();
        $estimatedMaterialCost = 0;
        foreach ($items as &$item) {
            $item['estimated_line_cost_cents'] = $item['estimated_unit_cost_cents'] === null
                ? null
                : intdiv((int) $item['estimated_unit_cost_cents'] * (int) $item['quantity_milli'] + 500, 1000);
            if ($item['estimated_line_cost_cents'] !== null) {
                $estimatedMaterialCost += (int) $item['estimated_line_cost_cents'];
            }
            $item['quantity_milli'] = (int) $item['quantity_milli'];
        }
        unset($item);
        $product['bom'] = [
            'id' => (int) $bom['id'],
            'version' => (int) $bom['version'],
            'notes' => $bom['notes'],
            'created_at' => $bom['created_at'],
            'items' => $items,
            'estimated_material_cost_cents' => $estimatedMaterialCost,
        ];
    }
    unset($product);

    $componentQuery = $database->prepare(
        'SELECT id, code, name, description, unit, stock, price_cents, low_stock_at,
                estimated_unit_cost_cents, cost_is_estimate, orderable, active
         FROM components WHERE active = 1 OR ? = 1 ORDER BY active DESC, name'
    );
    $componentQuery->execute([$includeInactive ? 1 : 0]);
    $components = $componentQuery->fetchAll();
    foreach ($components as &$component) {
        foreach (['id', 'stock', 'price_cents', 'low_stock_at', 'estimated_unit_cost_cents', 'cost_is_estimate', 'orderable', 'active'] as $key) {
            if ($component[$key] !== null) {
                $component[$key] = (int) $component[$key];
            }
        }
    }
    unset($component);
    return ['products' => $products, 'components' => $components];
}

function catalogUserList(PDO $database): array
{
    return $database->query(
        'SELECT u.id, u.username, u.display_name, r.role_key, r.name AS role_name, u.active, u.created_at
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.deleted_at IS NULL ORDER BY u.active DESC, u.username'
    )->fetchAll();
}

if (!isset($_SESSION['user_id'])) {
    catalogRespond(401, ['message' => 'Sign in to use the catalog.']);
}

try {
    $database = clearDropDatabase();
    $currentUser = clearDropCurrentUser($database);
    if (!$currentUser) {
        catalogRespond(401, ['message' => 'Your session is no longer active. Sign in again.']);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = (string) ($_GET['action'] ?? 'catalog');
        if ($action === 'catalog') {
            catalogRespond(200, catalogSnapshot($database, ($_SESSION['role'] ?? '') === 'admin'));
        }
        if ($action === 'users') {
            catalogAdmin();
            catalogRespond(200, ['users' => catalogUserList($database)]);
        }
        catalogRespond(400, ['message' => 'Unknown catalog action.']);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: GET, POST');
        catalogRespond(405, ['message' => 'Use GET to read catalog data or POST to make catalog changes.']);
    }

    $input = catalogInput();
    $actorId = (int) $currentUser['id'];
    $action = $input['action'];
    catalogAdmin();

    if ($action === 'save_product') {
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
        if (array_key_exists('id', $input) && $input['id'] !== null && ($id === false || $id < 1)) {
            catalogRespond(400, ['message' => 'Choose a valid product.']);
        }
        $sku = strtoupper(catalogText($input['sku'] ?? '', 'SKU'));
        $name = catalogText($input['name'] ?? '', 'Product name');
        $type = catalogText($input['productType'] ?? '', 'Product type');
        $description = catalogText($input['description'] ?? '', 'Product description');
        $active = filter_var($input['active'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($sku === '' || strlen($sku) > 40 || !preg_match('/^[A-Z0-9][A-Z0-9-]{2,39}$/', $sku)
            || $name === '' || strlen($name) > 120 || !in_array($type, ['finished_good', 'cartridge'], true)
            || strlen($description) > 1000 || $active === null) {
            catalogRespond(400, ['message' => 'Enter a valid SKU, product name, product type, description, and active state.']);
        }
        $salePrice = centsValue($input['salePriceCents'] ?? null, 'Sale price');
        $estimatedCost = centsValue($input['estimatedCostCents'] ?? null, 'Estimated cost', true);
        $isEstimate = filter_var($input['costIsEstimate'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($isEstimate === null) {
            catalogRespond(400, ['message' => 'Choose whether the product cost is an estimate.']);
        }
        clearDropBeginTransaction($database);
        if ($id !== false && $id !== null && $id > 0) {
            $beforeQuery = $database->prepare(
                'SELECT sku, sale_price_cents, estimated_unit_cost_cents, active FROM products WHERE id = ?'
            );
            $beforeQuery->execute([$id]);
            $before = $beforeQuery->fetch();
            if (!$before) {
                $database->rollBack();
                catalogRespond(404, ['message' => 'Product not found.']);
            }
            $statement = $database->prepare(
                'UPDATE products SET sku = ?, name = ?, product_type = ?, description = ?,
                    sale_price_cents = ?, estimated_unit_cost_cents = ?, cost_is_estimate = ?,
                    active = ?, deleted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $statement->execute([
                $sku, $name, $type, $description, $salePrice, $estimatedCost,
                $isEstimate ? 1 : 0, $active ? 1 : 0, $active ? null : gmdate('Y-m-d H:i:s'), $id,
            ]);
            $productId = $id;
            clearDropAudit($database, $actorId, 'product', $productId, 'updated', [
                'before' => $before,
                'after' => [
                    'sku' => $sku,
                    'sale_price_cents' => $salePrice,
                    'estimated_unit_cost_cents' => $estimatedCost,
                    'active' => $active,
                ],
            ]);
        } else {
            $database->prepare(
                'INSERT INTO products
                    (sku, name, product_type, description, sale_price_cents, estimated_unit_cost_cents, cost_is_estimate, active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $sku, $name, $type, $description, $salePrice, $estimatedCost, $isEstimate ? 1 : 0, $active ? 1 : 0,
            ]);
            $productId = clearDropLastInsertId($database);
            clearDropAudit($database, $actorId, 'product', $productId, 'created', [
                'sku' => $sku,
                'sale_price_cents' => $salePrice,
                'estimated_unit_cost_cents' => $estimatedCost,
                'cost_is_estimate' => $isEstimate,
            ]);
        }
        $database->exec('COMMIT');
        catalogRespond(200, ['message' => 'Product saved.', 'productId' => $productId]);
    }

    if ($action === 'save_component') {
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
        if (array_key_exists('id', $input) && $input['id'] !== null && ($id === false || $id < 1)) {
            catalogRespond(400, ['message' => 'Choose a valid component.']);
        }
        $code = strtoupper(catalogText($input['code'] ?? '', 'Component code'));
        $name = catalogText($input['name'] ?? '', 'Component name');
        $description = catalogText($input['description'] ?? '', 'Component description');
        $unit = catalogText($input['unit'] ?? '', 'Component unit');
        $active = filter_var($input['active'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        $orderable = filter_var($input['orderable'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        $lowStockAt = filter_var($input['lowStockAt'] ?? 5, FILTER_VALIDATE_INT);
        if ($code === '' || strlen($code) > 40 || !preg_match('/^[A-Z0-9][A-Z0-9-]{2,39}$/', $code)
            || $name === '' || strlen($name) > 120 || $description === '' || strlen($description) > 1000
            || $unit === '' || strlen($unit) > 32 || $active === null || $orderable === null
            || $lowStockAt === false || $lowStockAt < 0 || $lowStockAt > 1000000) {
            catalogRespond(400, ['message' => 'Enter valid component details and reorder threshold.']);
        }
        $estimatedCost = centsValue($input['estimatedUnitCostCents'] ?? null, 'Estimated unit cost', true);
        $orderPrice = centsValue($input['priceCents'] ?? 0, 'Order price');
        clearDropBeginTransaction($database);
        if ($id !== false && $id !== null && $id > 0) {
            $beforeQuery = $database->prepare(
                'SELECT code, estimated_unit_cost_cents, price_cents, active FROM components WHERE id = ?'
            );
            $beforeQuery->execute([$id]);
            $before = $beforeQuery->fetch();
            if (!$before) {
                $database->rollBack();
                catalogRespond(404, ['message' => 'Component not found.']);
            }
            $statement = $database->prepare(
                'UPDATE components SET code = ?, name = ?, description = ?, unit = ?, price_cents = ?,
                    low_stock_at = ?, estimated_unit_cost_cents = ?, cost_is_estimate = 1,
                    orderable = ?, active = ?, deleted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $statement->execute([
                $code, $name, $description, $unit, $orderPrice, $lowStockAt, $estimatedCost,
                $orderable ? 1 : 0, $active ? 1 : 0, $active ? null : gmdate('Y-m-d H:i:s'), $id,
            ]);
            $componentId = $id;
            clearDropAudit($database, $actorId, 'component', $componentId, 'updated', [
                'before' => $before,
                'after' => [
                    'code' => $code,
                    'estimated_unit_cost_cents' => $estimatedCost,
                    'price_cents' => $orderPrice,
                    'active' => $active,
                ],
            ]);
        } else {
            $database->prepare(
                'INSERT INTO components
                    (code, name, description, unit, stock, price_cents, low_stock_at, estimated_unit_cost_cents,
                     cost_is_estimate, orderable, active)
                 VALUES (?, ?, ?, ?, 0, ?, ?, ?, 1, ?, ?)'
            )->execute([
                $code, $name, $description, $unit, $orderPrice, $lowStockAt, $estimatedCost,
                $orderable ? 1 : 0, $active ? 1 : 0,
            ]);
            $componentId = clearDropLastInsertId($database);
            clearDropAudit($database, $actorId, 'component', $componentId, 'created', ['code' => $code]);
        }
        $database->exec('COMMIT');
        catalogRespond(200, ['message' => 'Component saved. Stock is not changed by catalog edits.', 'componentId' => $componentId]);
    }

    if ($action === 'save_bom') {
        $productId = filter_var($input['productId'] ?? null, FILTER_VALIDATE_INT);
        $items = $input['items'] ?? null;
        $notes = catalogText($input['notes'] ?? '', 'BOM notes');
        if (!$productId || $productId < 1 || !is_array($items) || count($items) > 200 || strlen($notes) > 1000) {
            catalogRespond(400, ['message' => 'Choose a product and provide a valid bill of materials.']);
        }
        $productQuery = $database->prepare('SELECT sku FROM products WHERE id = ? AND active = 1');
        $productQuery->execute([$productId]);
        $sku = $productQuery->fetchColumn();
        if (!$sku) {
            catalogRespond(404, ['message' => 'Active product not found.']);
        }
        $normalizedItems = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                catalogRespond(400, ['message' => 'Each BOM item must include a component and quantity.']);
            }
            $componentId = filter_var($item['componentId'] ?? null, FILTER_VALIDATE_INT);
            $quantityMilli = filter_var($item['quantityMilli'] ?? null, FILTER_VALIDATE_INT);
            if (!$componentId || $componentId < 1 || !$quantityMilli || $quantityMilli < 1 || $quantityMilli > 100000000) {
                catalogRespond(400, ['message' => 'BOM quantities must be positive values with up to three decimal places.']);
            }
            if (isset($normalizedItems[$componentId])) {
                catalogRespond(400, ['message' => 'A component may appear only once in a BOM version.']);
            }
            $normalizedItems[$componentId] = $quantityMilli;
        }
        if (!$normalizedItems) {
            catalogRespond(400, ['message' => 'Add at least one component to the bill of materials.']);
        }

        clearDropBeginTransaction($database);
        try {
            $componentQuery = $database->prepare('SELECT 1 FROM components WHERE id = ? AND active = 1');
            foreach ($normalizedItems as $componentId => $quantityMilli) {
                $componentQuery->execute([$componentId]);
                if (!$componentQuery->fetchColumn()) {
                    throw new DomainException('Every BOM component must be active.');
                }
            }
            $versionQuery = $database->prepare('SELECT COALESCE(MAX(version), 0) + 1 FROM bom_versions WHERE product_id = ?');
            $versionQuery->execute([$productId]);
            $version = (int) $versionQuery->fetchColumn();
            $database->prepare(
                'INSERT INTO bom_versions (product_id, version, notes, created_by) VALUES (?, ?, ?, ?)'
            )->execute([$productId, $version, $notes, $actorId]);
            $bomId = clearDropLastInsertId($database);
            $addItem = $database->prepare(
                'INSERT INTO bom_items (bom_version_id, component_id, quantity_milli) VALUES (?, ?, ?)'
            );
            foreach ($normalizedItems as $componentId => $quantityMilli) {
                $addItem->execute([$bomId, $componentId, $quantityMilli]);
            }
            clearDropAudit($database, $actorId, 'bom', $bomId, 'version_created', [
                'product_id' => $productId,
                'product_sku' => $sku,
                'version' => $version,
            ]);
            $database->exec('COMMIT');
        } catch (Throwable $error) {
            if ($database->inTransaction()) {
                $database->rollBack();
            }
            if ($error instanceof DomainException) {
                catalogRespond(400, ['message' => $error->getMessage()]);
            }
            throw $error;
        }
        catalogRespond(201, [
            'message' => 'A new BOM version was created.',
            'version' => $version,
            'productId' => $productId,
        ]);
    }

    if ($action === 'create_user') {
        $username = catalogText($input['username'] ?? '', 'Username');
        $displayName = catalogText($input['displayName'] ?? '', 'Display name');
        $password = $input['password'] ?? '';
        $roleKey = $input['role'] ?? '';
        if (!is_string($password) || !preg_match('/^[a-zA-Z0-9._-]{3,32}$/', $username)
            || $displayName === '' || strlen($displayName) > 120 || strlen($password) < 12
            || strlen($password) > 72 || !is_string($roleKey)
            || !in_array($roleKey, ['admin', 'inventory', 'production', 'sales', 'partner', 'distributor', 'customer'], true)) {
            catalogRespond(400, ['message' => 'Provide a 3–32 character username, name, approved role, and a 12–72 character password.']);
        }
        clearDropBeginTransaction($database);
        $database->prepare(
            'INSERT INTO users (username, display_name, password_hash, role_id)
             SELECT ?, ?, ?, id FROM roles WHERE role_key = ?'
        )->execute([$username, $displayName, password_hash($password, PASSWORD_DEFAULT), $roleKey]);
        $userId = clearDropLastInsertId($database);
        clearDropAudit($database, $actorId, 'user', $userId, 'created', ['username' => $username, 'role' => $roleKey]);
        $database->exec('COMMIT');
        catalogRespond(201, ['message' => 'User created.', 'userId' => $userId]);
    }

    if ($action === 'update_user_role') {
        $userId = filter_var($input['userId'] ?? null, FILTER_VALIDATE_INT);
        $roleKey = $input['role'] ?? '';
        if (!$userId || $userId < 1 || $userId === $actorId || !is_string($roleKey)
            || !in_array($roleKey, ['admin', 'inventory', 'production', 'sales', 'partner', 'distributor', 'customer'], true)) {
            catalogRespond(400, ['message' => 'Choose another valid account and role.']);
        }
        clearDropBeginTransaction($database);
        $beforeQuery = $database->prepare(
            'SELECT u.username, r.role_key FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.id = ? AND u.deleted_at IS NULL'
        );
        $beforeQuery->execute([$userId]);
        $before = $beforeQuery->fetch();
        if (!$before) {
            $database->rollBack();
            catalogRespond(404, ['message' => 'User not found.']);
        }
        $database->prepare(
            'UPDATE users SET role_id = (SELECT id FROM roles WHERE role_key = ?) WHERE id = ?'
        )->execute([$roleKey, $userId]);
        clearDropAudit($database, $actorId, 'user', $userId, 'role_changed', [
            'username' => $before['username'],
            'from' => $before['role_key'],
            'to' => $roleKey,
        ]);
        $database->exec('COMMIT');
        catalogRespond(200, ['message' => 'User role updated.']);
    }

    if ($action === 'deactivate_user') {
        $userId = filter_var($input['userId'] ?? null, FILTER_VALIDATE_INT);
        if (!$userId || $userId < 1 || $userId === $actorId) {
            catalogRespond(400, ['message' => 'Choose another valid account to deactivate.']);
        }
        clearDropBeginTransaction($database);
        $statement = $database->prepare(
            'UPDATE users SET active = 0, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL'
        );
        $statement->execute([$userId]);
        if ($statement->rowCount() !== 1) {
            $database->rollBack();
            catalogRespond(404, ['message' => 'Active user not found.']);
        }
        clearDropAudit($database, $actorId, 'user', $userId, 'deactivated');
        $database->exec('COMMIT');
        catalogRespond(200, ['message' => 'User deactivated; historical records are retained.']);
    }

    catalogRespond(400, ['message' => 'Unknown catalog action.']);
} catch (PDOException $error) {
    if (isset($database) && $database instanceof PDO && $database->inTransaction()) {
        $database->rollBack();
    }
    if ((string) $error->getCode() === '23000' || str_contains($error->getMessage(), 'UNIQUE constraint failed')) {
        catalogRespond(409, ['message' => 'That SKU, code, or username is already in use.']);
    }
    error_log('ClearDrop catalog database error: ' . $error->getMessage());
    catalogRespond(500, ['message' => 'The catalog database request failed. Check the PHP server log.']);
} catch (Throwable $error) {
    if (isset($database) && $database instanceof PDO && $database->inTransaction()) {
        $database->rollBack();
    }
    error_log('ClearDrop catalog API error: ' . $error->getMessage());
    catalogRespond(500, ['message' => 'The catalog service encountered an error. Check the PHP server log.']);
}
