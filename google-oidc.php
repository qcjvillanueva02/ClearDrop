<?php
declare(strict_types=1);

final class GoogleIdentityException extends RuntimeException
{
}

final class GoogleSigningKeyRotationException extends RuntimeException
{
}

function googleBase64UrlDecode(string $value): string
{
    if ($value === '' || preg_match('/[^A-Za-z0-9_-]/', $value)) {
        throw new GoogleIdentityException('The Google identity token is malformed.');
    }
    $decoded = base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4), true);
    if ($decoded === false) {
        throw new GoogleIdentityException('The Google identity token is malformed.');
    }
    return $decoded;
}

function googleDerLength(int $length): string
{
    if ($length < 0x80) {
        return chr($length);
    }
    $bytes = '';
    while ($length > 0) {
        $bytes = chr($length & 0xff) . $bytes;
        $length >>= 8;
    }
    return chr(0x80 | strlen($bytes)) . $bytes;
}

function googleDer(int $tag, string $value): string
{
    return chr($tag) . googleDerLength(strlen($value)) . $value;
}

function googleRsaJwkToPem(array $jwk): string
{
    if (($jwk['kty'] ?? '') !== 'RSA' || !isset($jwk['n'], $jwk['e'])
        || !is_string($jwk['n']) || !is_string($jwk['e'])) {
        throw new RuntimeException('Google returned an unsupported signing key.');
    }
    $modulus = ltrim(googleBase64UrlDecode($jwk['n']), "\x00");
    $exponent = ltrim(googleBase64UrlDecode($jwk['e']), "\x00");
    if ($modulus === '' || $exponent === '') {
        throw new RuntimeException('Google returned an invalid signing key.');
    }
    if ((ord($modulus[0]) & 0x80) !== 0) {
        $modulus = "\x00" . $modulus;
    }
    if ((ord($exponent[0]) & 0x80) !== 0) {
        $exponent = "\x00" . $exponent;
    }

    $rsaPublicKey = googleDer(
        0x30,
        googleDer(0x02, $modulus) . googleDer(0x02, $exponent)
    );
    $algorithmIdentifier = hex2bin('300d06092a864886f70d0101010500');
    if ($algorithmIdentifier === false) {
        throw new RuntimeException('Unable to prepare the Google signing key.');
    }
    $subjectPublicKeyInfo = googleDer(
        0x30,
        $algorithmIdentifier . googleDer(0x03, "\x00" . $rsaPublicKey)
    );
    return "-----BEGIN PUBLIC KEY-----\n"
        . chunk_split(base64_encode($subjectPublicKeyInfo), 64, "\n")
        . "-----END PUBLIC KEY-----\n";
}

function googleFetchJwks(): array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 6,
            'ignore_errors' => false,
            'header' => "Accept: application/json\r\n",
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);
    $body = @file_get_contents('https://www.googleapis.com/oauth2/v3/certs', false, $context);
    if ($body === false) {
        throw new RuntimeException('Could not retrieve Google signing keys. Check the server internet connection and try again.');
    }
    $document = json_decode($body, true);
    if (!is_array($document) || !isset($document['keys']) || !is_array($document['keys'])) {
        throw new RuntimeException('Google returned an invalid signing-key response.');
    }

    $maxAge = 1800;
    foreach ($http_response_header ?? [] as $header) {
        if (preg_match('/^Cache-Control:\s*.*?max-age=(\d+)/i', $header, $match)) {
            $maxAge = min(3600, max(60, (int) $match[1]));
        }
    }
    return ['keys' => $document['keys'], 'expires_at' => time() + $maxAge];
}

function googleVerifyIdToken(string $token, string $clientId, string $expectedNonce, array $jwks): array
{
    if (strlen($token) > 12000) {
        throw new GoogleIdentityException('The Google identity token is too large.');
    }
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new GoogleIdentityException('The Google identity token is malformed.');
    }
    $header = json_decode(googleBase64UrlDecode($parts[0]), true);
    $claims = json_decode(googleBase64UrlDecode($parts[1]), true);
    if (!is_array($header) || !is_array($claims) || ($header['alg'] ?? '') !== 'RS256'
        || !isset($header['kid']) || !is_string($header['kid'])) {
        throw new GoogleIdentityException('The Google identity token has invalid claims.');
    }

    $key = null;
    foreach ($jwks['keys'] ?? [] as $candidate) {
        if (is_array($candidate) && ($candidate['kid'] ?? null) === $header['kid']) {
            $key = $candidate;
            break;
        }
    }
    if (!$key) {
        throw new GoogleSigningKeyRotationException('Google signing key rotated; retry sign-in.');
    }
    $signature = googleBase64UrlDecode($parts[2]);
    $verification = openssl_verify(
        $parts[0] . '.' . $parts[1],
        $signature,
        googleRsaJwkToPem($key),
        OPENSSL_ALGO_SHA256
    );
    if ($verification !== 1) {
        throw new GoogleIdentityException('Google identity token signature is invalid.');
    }

    $issuer = $claims['iss'] ?? '';
    $now = time();
    if (!in_array($issuer, ['accounts.google.com', 'https://accounts.google.com'], true)
        || ($claims['aud'] ?? null) !== $clientId
        || (isset($claims['azp']) && $claims['azp'] !== $clientId)
        || !isset($claims['exp'], $claims['iat'], $claims['sub'], $claims['nonce'])
        || !is_numeric($claims['exp']) || !is_numeric($claims['iat'])
        || (int) $claims['exp'] <= $now
        || (int) $claims['iat'] > $now + 60
        || !is_string($claims['sub']) || $claims['sub'] === '' || strlen($claims['sub']) > 255
        || !is_string($claims['nonce']) || !hash_equals($expectedNonce, $claims['nonce'])
        || !filter_var($claims['email'] ?? null, FILTER_VALIDATE_EMAIL)
        || !in_array($claims['email_verified'] ?? false, [true, 'true'], true)) {
        throw new GoogleIdentityException('Google sign-in could not verify the account, client, or login request. Try again.');
    }

    return $claims;
}
