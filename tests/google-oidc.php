<?php
declare(strict_types=1);

require_once __DIR__ . '/../google-oidc.php';

if (!function_exists('openssl_pkey_new')) {
    fwrite(STDERR, "OpenSSL is required for Google ID-token tests.\n");
    exit(1);
}

$opensslConfig = tempnam(sys_get_temp_dir(), 'cleardrop-openssl-');
if ($opensslConfig === false) {
    throw new RuntimeException('Could not create a temporary OpenSSL configuration file.');
}
register_shutdown_function(static function () use ($opensslConfig): void {
    if (is_file($opensslConfig)) {
        unlink($opensslConfig);
    }
});

function testBase64UrlEncode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function testGoogleToken(array $claims, OpenSSLAsymmetricKey $privateKey): string
{
    $header = testBase64UrlEncode(json_encode(
        ['alg' => 'RS256', 'kid' => 'test-key'],
        JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    ));
    $payload = testBase64UrlEncode(json_encode($claims, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    $signingInput = $header . '.' . $payload;
    if (!openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
        throw new RuntimeException('Could not sign a test identity token.');
    }
    return $signingInput . '.' . testBase64UrlEncode($signature);
}

function testRejectsGoogleToken(string $token, string $clientId, string $nonce, array $jwks): void
{
    try {
        googleVerifyIdToken($token, $clientId, $nonce, $jwks);
    } catch (GoogleIdentityException $error) {
        return;
    }
    throw new RuntimeException('Expected Google ID-token validation to reject this token.');
}

$keyOptions = [
    'config' => $opensslConfig,
    'private_key_type' => OPENSSL_KEYTYPE_RSA,
    'private_key_bits' => 2048,
];
$privateKey = openssl_pkey_new($keyOptions);
$otherPrivateKey = openssl_pkey_new($keyOptions);
if (!$privateKey instanceof OpenSSLAsymmetricKey || !$otherPrivateKey instanceof OpenSSLAsymmetricKey) {
    throw new RuntimeException('Could not generate RSA keys for Google ID-token tests.');
}
$publicKey = openssl_pkey_get_details($privateKey);
$jwks = ['keys' => [[
    'kty' => 'RSA',
    'kid' => 'test-key',
    'n' => testBase64UrlEncode($publicKey['rsa']['n']),
    'e' => testBase64UrlEncode($publicKey['rsa']['e']),
]]];
$now = time();
$claims = [
    'iss' => 'https://accounts.google.com',
    'aud' => 'cleardrop-test-client',
    'exp' => $now + 300,
    'iat' => $now,
    'sub' => 'google-subject-123',
    'nonce' => 'session-test-nonce',
    'email' => 'test@example.com',
    'email_verified' => true,
];

$valid = googleVerifyIdToken(
    testGoogleToken($claims, $privateKey),
    'cleardrop-test-client',
    'session-test-nonce',
    $jwks
);
if ($valid['sub'] !== 'google-subject-123') {
    throw new RuntimeException('Google ID-token verification returned an unexpected subject.');
}
testRejectsGoogleToken(
    testGoogleToken(array_replace($claims, ['aud' => 'another-client']), $privateKey),
    'cleardrop-test-client',
    'session-test-nonce',
    $jwks
);
testRejectsGoogleToken(
    testGoogleToken(array_replace($claims, ['nonce' => 'another-nonce']), $privateKey),
    'cleardrop-test-client',
    'session-test-nonce',
    $jwks
);
testRejectsGoogleToken(
    testGoogleToken(array_replace($claims, ['exp' => $now - 1]), $privateKey),
    'cleardrop-test-client',
    'session-test-nonce',
    $jwks
);
testRejectsGoogleToken(
    testGoogleToken($claims, $otherPrivateKey),
    'cleardrop-test-client',
    'session-test-nonce',
    $jwks
);
testRejectsGoogleToken(
    testGoogleToken(array_replace($claims, ['email_verified' => false]), $privateKey),
    'cleardrop-test-client',
    'session-test-nonce',
    $jwks
);

echo "Google ID-token tests passed.\n";
