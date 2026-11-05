<?php
declare(strict_types=1);

putenv('CLEARDROP_DB_PATH=:memory:');
require_once __DIR__ . '/../database.php';

function check(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    fwrite(STDOUT, "PASS: {$message}\n");
}

$database = clearDropDatabase();
$roles = $database->query('SELECT COUNT(*) FROM roles')->fetchColumn();
check((int) $roles === 7, 'all demo roles are seeded');

$admin = $database->query(
    "SELECT u.password_hash, r.role_key FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.username = 'clearadmin'"
)->fetch();
check(is_array($admin) && $admin['role_key'] === 'admin', 'admin role resolves from the database');
check(password_verify('stock123', $admin['password_hash']), 'demo account password is stored as a hash');

$filter = $database->query("SELECT id, sale_price_cents, estimated_unit_cost_cents FROM products WHERE sku = 'CD-UNIT-001'")->fetch();
check(is_array($filter), 'finished filter product is seeded');
check((int) $filter['sale_price_cents'] === 350000, 'filter selling-price estimate is PHP 3,500');
check((int) $filter['estimated_unit_cost_cents'] === 275000, 'filter production-cost estimate is PHP 2,750');
check((int) $filter['sale_price_cents'] - (int) $filter['estimated_unit_cost_cents'] === 75000, 'estimated unit profit is PHP 750');

$bom = $database->prepare(
    'SELECT b.id, b.version FROM bom_versions b JOIN products p ON p.id = b.product_id
     WHERE p.sku = ? ORDER BY b.version DESC LIMIT 1'
);
$bom->execute(['CD-UNIT-001']);
$filterBom = $bom->fetch();
check(is_array($filterBom) && (int) $filterBom['version'] === 1, 'finished filter has initial BOM version');

$costQuery = $database->prepare(
    'SELECT SUM(CAST((c.estimated_unit_cost_cents * bi.quantity_milli + 500) / 1000 AS INTEGER))
     FROM bom_items bi JOIN components c ON c.id = bi.component_id
     WHERE bi.bom_version_id = ?'
);
$costQuery->execute([(int) $filterBom['id']]);
check((int) $costQuery->fetchColumn() === 145000, 'filter BOM material estimate totals PHP 1,450');

$bom->execute(['CD-CART-001']);
$cartridgeBom = $bom->fetch();
check(is_array($cartridgeBom) && (int) $cartridgeBom['version'] === 1, 'replacement cartridge has initial BOM version');
$costQuery->execute([(int) $cartridgeBom['id']]);
check((int) $costQuery->fetchColumn() === 40000, 'cartridge BOM estimate totals PHP 400');

$hiddenFromOrdering = (int) $database->query(
    "SELECT COUNT(*) FROM components WHERE orderable = 0 AND code = 'CD-COMP-BUCKET-001'"
)->fetchColumn();
check($hiddenFromOrdering === 1, 'raw production components are separate from orderable items');

fwrite(STDOUT, "Phase 1 catalog checks passed.\n");
