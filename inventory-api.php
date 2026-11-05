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

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    respond(401, ['message' => 'Sign in to view stock or place an order.']);
}

function readInput(): array
{
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        respond(400, ['message' => 'Request body must be valid JSON.']);
    }
    return $input;
}

function db(): PDO
{
    return clearDropDatabase();
}

function beginImmediate(PDO $database): void
{
    clearDropBeginTransaction($database);
}

function rollback(PDO $database): void
{
    if ($database->inTransaction()) {
        $database->rollBack();
    }
}

function dashboardData(PDO $database, string $username, string $role): array
{
    $materials = $database->query(
        'SELECT id, code, name, description, unit, stock, price_cents, low_stock_at
         FROM components WHERE active = 1 AND orderable = 1 ORDER BY name'
    )->fetchAll();

    $cartQuery = $database->prepare(
        'SELECT r.material_id AS id, m.code, m.name, m.unit, r.quantity, m.price_cents
         FROM order_reservations r JOIN components m ON m.id = r.material_id
         WHERE r.username = ? ORDER BY m.name'
    );
    $cartQuery->execute([$username]);
    $cart = $cartQuery->fetchAll();

    $ordersQuery = $database->prepare(
        'SELECT id, username, customer_name, contact, status, total_cents, created_at
         FROM orders ' . ($role === 'admin' ? '' : 'WHERE username = ? ') .
        'ORDER BY id DESC LIMIT 30'
    );
    $ordersQuery->execute($role === 'admin' ? [] : [$username]);
    $orders = $ordersQuery->fetchAll();
    $itemQuery = $database->prepare(
        'SELECT material_name AS name, unit, quantity
         FROM order_items WHERE order_id = ? ORDER BY material_name'
    );
    foreach ($orders as &$order) {
        $itemQuery->execute([$order['id']]);
        $order['items'] = $itemQuery->fetchAll();
    }
    unset($order);

    return ['materials' => $materials, 'cart' => $cart, 'orders' => $orders, 'role' => $role];
}

try {
    $database = db();
    $currentUser = clearDropCurrentUser($database);
    if (!$currentUser) {
        respond(401, ['message' => 'Your session is no longer active. Sign in again.']);
    }
    $username = (string) $currentUser['username'];
    $role = (string) $currentUser['role_key'];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = (string) ($_GET['action'] ?? 'dashboard');
        if ($action !== 'dashboard') {
            respond(400, ['message' => 'Unknown dashboard action.']);
        }
        respond(200, dashboardData($database, $username, $role));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: GET, POST');
        respond(405, ['message' => 'Use GET to load the dashboard or POST to update an order.']);
    }

    $input = readInput();
    $action = $input['action'] ?? '';
    if (!is_string($action)) {
        respond(400, ['message' => 'A valid dashboard action is required.']);
    }

    if ($action === 'cart_add') {
        $code = $input['code'] ?? '';
        if (!is_string($code) || strlen($code) > 80) {
            respond(400, ['message' => 'Enter a valid material QR code.']);
        }

        beginImmediate($database);
        $materialQuery = $database->prepare(
            'SELECT id, name FROM components WHERE code = ? AND active = 1 AND orderable = 1'
        );
        $materialQuery->execute([strtoupper(trim($code))]);
        $material = $materialQuery->fetch();
        if (!$material) {
            rollback($database);
            respond(404, ['message' => 'That QR code does not match a stocked ClearDrop material.']);
        }

        $decrement = $database->prepare(
            'UPDATE components SET stock = stock - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock > 0'
        );
        $decrement->execute([$material['id']]);
        if ($decrement->rowCount() !== 1) {
            rollback($database);
            respond(409, ['message' => $material['name'] . ' is out of stock.']);
        }
        $reserve = $database->prepare(
            'INSERT INTO order_reservations (username, material_id, quantity) VALUES (?, ?, 1)
             ON CONFLICT(username, material_id) DO UPDATE SET quantity = quantity + 1'
        );
        $reserve->execute([$username, $material['id']]);
        $database->exec('COMMIT');
        respond(200, ['message' => 'One unit reserved in your basket.']);
    }

    if ($action === 'cart_remove') {
        $materialId = filter_var($input['materialId'] ?? null, FILTER_VALIDATE_INT);
        if (!$materialId || $materialId < 1) {
            respond(400, ['message' => 'Choose a valid basket item.']);
        }
        beginImmediate($database);
        $reserved = $database->prepare(
            'SELECT quantity FROM order_reservations WHERE username = ? AND material_id = ?'
        );
        $reserved->execute([$username, $materialId]);
        $row = $reserved->fetch();
        if (!$row) {
            rollback($database);
            respond(404, ['message' => 'That item is no longer in your basket.']);
        }
        $database->prepare(
            'UPDATE components SET stock = stock + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        )->execute([$materialId]);
        if ((int) $row['quantity'] === 1) {
            $database->prepare(
                'DELETE FROM order_reservations WHERE username = ? AND material_id = ?'
            )->execute([$username, $materialId]);
        } else {
            $database->prepare(
                'UPDATE order_reservations SET quantity = quantity - 1 WHERE username = ? AND material_id = ?'
            )->execute([$username, $materialId]);
        }
        $database->exec('COMMIT');
        respond(200, ['message' => 'One unit returned to stock.']);
    }

    if ($action === 'restock') {
        if ($role !== 'admin') {
            respond(403, ['message' => 'Only the stock manager can restock materials.']);
        }
        $materialId = filter_var($input['materialId'] ?? null, FILTER_VALIDATE_INT);
        $quantity = filter_var($input['quantity'] ?? null, FILTER_VALIDATE_INT);
        if (!$materialId || $materialId < 1 || !$quantity || $quantity < 1 || $quantity > 10000) {
            respond(400, ['message' => 'Restock quantity must be between 1 and 10,000.']);
        }
        $update = $database->prepare(
            'UPDATE components SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND active = 1'
        );
        $update->execute([$quantity, $materialId]);
        if ($update->rowCount() !== 1) {
            respond(404, ['message' => 'Material not found.']);
        }
        respond(200, ['message' => 'Stock updated.']);
    }

    if ($action === 'checkout') {
        $customerName = trim((string) ($input['customerName'] ?? ''));
        $contact = trim((string) ($input['contact'] ?? ''));
        if (strlen($customerName) < 2 || strlen($customerName) > 80
            || strlen($contact) < 5 || strlen($contact) > 40) {
            respond(400, ['message' => 'Enter a name and contact number before checkout.']);
        }

        beginImmediate($database);
        $cartQuery = $database->prepare(
            'SELECT r.material_id, r.quantity, m.name, m.unit, m.price_cents
             FROM order_reservations r JOIN components m ON m.id = r.material_id
             WHERE r.username = ?'
        );
        $cartQuery->execute([$username]);
        $items = $cartQuery->fetchAll();
        if (!$items) {
            rollback($database);
            respond(409, ['message' => 'Add at least one material before checkout.']);
        }

        $total = 0;
        foreach ($items as $item) {
            $total += (int) $item['price_cents'] * (int) $item['quantity'];
        }
        $database->prepare(
            'INSERT INTO orders (username, customer_name, contact, total_cents, status)
             VALUES (?, ?, ?, ?, \'pending\')'
        )->execute([$username, $customerName, $contact, $total]);
        $orderId = clearDropLastInsertId($database);
        $addItem = $database->prepare(
            'INSERT INTO order_items (order_id, material_id, material_name, unit, quantity, price_cents)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        foreach ($items as $item) {
            $addItem->execute([
                $orderId,
                $item['material_id'],
                $item['name'],
                $item['unit'],
                $item['quantity'],
                $item['price_cents'],
            ]);
        }
        $database->prepare('DELETE FROM order_reservations WHERE username = ?')->execute([$username]);
        $database->exec('COMMIT');
        respond(201, ['message' => 'Order placed and marked pending.', 'orderId' => $orderId]);
    }

    if ($action === 'order_status') {
        if ($role !== 'admin') {
            respond(403, ['message' => 'Only the stock manager can update order statuses.']);
        }
        $orderId = filter_var($input['orderId'] ?? null, FILTER_VALIDATE_INT);
        $newStatus = $input['status'] ?? '';
        $allowedStatuses = ['processing', 'ready', 'completed', 'cancelled'];
        if (!$orderId || $orderId < 1 || !is_string($newStatus)
            || !in_array($newStatus, $allowedStatuses, true)) {
            respond(400, ['message' => 'Choose a valid order and status.']);
        }

        beginImmediate($database);
        $orderQuery = $database->prepare(
            'SELECT status FROM orders WHERE id = ?' . ($role === 'admin' ? '' : ' AND username = ?')
        );
        $orderQuery->execute($role === 'admin' ? [$orderId] : [$orderId, $username]);
        $order = $orderQuery->fetch();
        if (!$order) {
            rollback($database);
            respond(404, ['message' => 'Order not found.']);
        }

        $transitions = [
            'pending' => ['processing', 'cancelled'],
            'processing' => ['ready', 'cancelled'],
            'ready' => ['completed'],
        ];
        if (!in_array($newStatus, $transitions[$order['status']] ?? [], true)) {
            rollback($database);
            respond(409, ['message' => 'That status change is not allowed.']);
        }

        if ($newStatus === 'cancelled') {
            $orderItems = $database->prepare('SELECT material_id, quantity FROM order_items WHERE order_id = ?');
            $orderItems->execute([$orderId]);
            $restoreMaterial = $database->prepare(
                'UPDATE components SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            foreach ($orderItems->fetchAll() as $item) {
                $restoreMaterial->execute([$item['quantity'], $item['material_id']]);
            }
        }

        $database->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$newStatus, $orderId]);
        $database->exec('COMMIT');
        respond(200, ['message' => 'Order status updated.']);
    }

    respond(400, ['message' => 'Unknown dashboard action.']);
} catch (Throwable $error) {
    if (isset($database) && $database instanceof PDO) {
        rollback($database);
    }
    error_log('ClearDrop inventory API error: ' . $error->getMessage());
    respond(500, ['message' => 'The inventory service encountered an error. Check the PHP server log.']);
}
