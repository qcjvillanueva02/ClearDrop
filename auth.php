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
require_once __DIR__ . '/google-oidc.php';

function authRespond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function authReadInput(): array
{
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input) || !isset($input['action']) || !is_string($input['action'])) {
        authRespond(400, ['message' => 'A valid JSON action is required.']);
    }
    return $input;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'google_config') {
    $clientId = trim((string) (getenv('GOOGLE_CLIENT_ID') ?: ''));
    if ($clientId === '') {
        authRespond(200, ['enabled' => false]);
    }
    try {
        if (!isset($_SESSION['google_login_nonce'])) {
            $_SESSION['google_login_nonce'] = bin2hex(random_bytes(32));
        }
        authRespond(200, [
            'enabled' => true,
            'clientId' => $clientId,
            'nonce' => $_SESSION['google_login_nonce'],
        ]);
    } catch (Throwable $error) {
        error_log('ClearDrop Google config error: ' . $error->getMessage());
        authRespond(500, ['message' => 'Google sign-in could not be initialized. Try again.']);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'status') {
    try {
        $database = clearDropDatabase();
        $user = clearDropCurrentUser($database);
        if ($user) {
            authRespond(200, [
                'authenticated' => true,
                'username' => $user['username'],
                'displayName' => $user['display_name'],
                'role' => $user['role_key'],
                'email' => $user['email'],
            ]);
        }
        authRespond(200, ['authenticated' => false]);
    } catch (Throwable $error) {
        error_log('ClearDrop auth status error: ' . $error->getMessage());
        authRespond(500, ['message' => 'The sign-in service encountered an error. Check the PHP server log.']);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    authRespond(405, ['message' => 'Use GET for session status or POST for login/logout.']);
}

$input = authReadInput();
if ($input['action'] === 'google_login') {
    $credential = $input['credential'] ?? '';
    $clientId = trim((string) (getenv('GOOGLE_CLIENT_ID') ?: ''));
    $nonce = $_SESSION['google_login_nonce'] ?? '';
    if (!is_string($credential) || $credential === '' || strlen($credential) > 12000
        || $clientId === '' || !is_string($nonce) || $nonce === '') {
        authRespond(400, ['message' => 'Google sign-in is not configured or the login request expired. Refresh and try again.']);
    }

    try {
        $cachedJwks = $_SESSION['google_jwks'] ?? null;
        if (!is_array($cachedJwks) || !isset($cachedJwks['expires_at'], $cachedJwks['keys'])
            || (int) $cachedJwks['expires_at'] <= time()) {
            $cachedJwks = googleFetchJwks();
            $_SESSION['google_jwks'] = $cachedJwks;
        }
        try {
            $claims = googleVerifyIdToken($credential, $clientId, $nonce, $cachedJwks);
        } catch (GoogleSigningKeyRotationException $error) {
            $cachedJwks = googleFetchJwks();
            $_SESSION['google_jwks'] = $cachedJwks;
            $claims = googleVerifyIdToken($credential, $clientId, $nonce, $cachedJwks);
        }

        $database = clearDropDatabase();
        clearDropBeginTransaction($database);
        $findUser = $database->prepare(
            'SELECT u.id, u.username, u.display_name, u.active, u.email, r.role_key
             FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.google_sub = ? AND u.deleted_at IS NULL'
        );
        $findUser->execute([$claims['sub']]);
        $user = $findUser->fetch();
        if (!$user) {
            $username = 'google_' . substr(hash('sha256', $claims['sub']), 0, 24);
            $displayName = is_string($claims['name'] ?? null) && trim($claims['name']) !== ''
                ? trim($claims['name'])
                : (string) $claims['email'];
            $passwordHash = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
            $configuredAdminEmail = strtolower(trim((string) (getenv('CLEARDROP_ADMIN_EMAIL') ?: '')));
            $roleKey = strtolower((string) $claims['email']) === $configuredAdminEmail
                && $configuredAdminEmail !== ''
                ? 'admin'
                : 'customer';
            $database->prepare(
                'INSERT INTO users (username, display_name, password_hash, google_sub, email, auth_provider, role_id)
                 SELECT ?, ?, ?, ?, ?, \'google\', id FROM roles WHERE role_key = ?'
            )->execute([$username, $displayName, $passwordHash, $claims['sub'], $claims['email'], $roleKey]);
            $userId = clearDropLastInsertId($database);
            clearDropAudit($database, null, 'user', $userId, 'google_account_created', ['username' => $username]);
            $findUser->execute([$claims['sub']]);
            $user = $findUser->fetch();
        } elseif (!(int) $user['active']) {
            $database->rollBack();
            unset($_SESSION['google_login_nonce']);
            authRespond(403, ['message' => 'This ClearDrop account is inactive. Contact an administrator.']);
        } else {
            $displayName = is_string($claims['name'] ?? null) && trim($claims['name']) !== ''
                ? trim($claims['name'])
                : (string) $claims['email'];
            $database->prepare(
                'UPDATE users SET email = ?, display_name = ?, auth_provider = \'google\' WHERE id = ?'
            )->execute([$claims['email'], $displayName, $user['id']]);
            $user['email'] = $claims['email'];
            $user['display_name'] = $displayName;
        }
        if (!$user) {
            $database->rollBack();
            authRespond(500, ['message' => 'The ClearDrop account could not be created. Try again.']);
        }
        $database->exec('COMMIT');
        unset($_SESSION['google_login_nonce']);
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role_key'];
        authRespond(200, [
            'authenticated' => true,
            'username' => $user['username'],
            'displayName' => $user['display_name'],
            'role' => $user['role_key'],
            'email' => $user['email'],
            'provider' => 'google',
        ]);
    } catch (Throwable $error) {
        if (isset($database) && $database instanceof PDO && $database->inTransaction()) {
            $database->rollBack();
        }
        error_log('ClearDrop Google login error: ' . $error->getMessage());
        authRespond($error instanceof GoogleIdentityException ? 401 : 503, [
            'message' => $error instanceof GoogleIdentityException
                ? 'Google could not verify this sign-in. Please try again.'
                : 'Google sign-in failed. Check server configuration and try again.',
        ]);
    }
}

if ($input['action'] === 'login') {
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    if (!is_string($username) || !is_string($password)
        || strlen($username) > 64 || strlen($password) > 256) {
        authRespond(400, ['message' => 'Enter a valid username and password.']);
    }

    try {
        $database = clearDropDatabase();
        $statement = $database->prepare(
            'SELECT u.id, u.username, u.display_name, u.password_hash, r.role_key
             FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.username = ? AND u.active = 1 AND u.deleted_at IS NULL'
        );
        $statement->execute([trim($username)]);
        $user = $statement->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            authRespond(401, ['message' => 'Incorrect demo username or password.']);
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role_key'];
        authRespond(200, [
            'authenticated' => true,
            'username' => $user['username'],
            'displayName' => $user['display_name'],
            'role' => $user['role_key'],
            'email' => null,
        ]);
    } catch (Throwable $error) {
        error_log('ClearDrop login error: ' . $error->getMessage());
        authRespond(500, ['message' => 'The sign-in service encountered an error. Check the PHP server log.']);
    }
}

if ($input['action'] === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $cookie = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $cookie['path'],
            'domain' => $cookie['domain'],
            'secure' => $cookie['secure'],
            'httponly' => $cookie['httponly'],
            'samesite' => 'Lax',
        ]);
    }
    session_destroy();
    authRespond(200, ['authenticated' => false]);
}

authRespond(400, ['message' => 'Unknown authentication action.']);
