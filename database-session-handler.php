<?php
declare(strict_types=1);

final class ClearDropPostgresSessionHandler implements SessionHandlerInterface
{
    private ?string $lockedSessionId = null;

    public function __construct(private PDO $database)
    {
    }

    public function open(string $path, string $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        $this->releaseLock();
        return true;
    }

    public function read(string $id): string|false
    {
        $lock = $this->database->prepare('SELECT pg_advisory_lock(1789, hashtext(?))');
        $lock->execute([$id]);
        $this->lockedSessionId = $id;

        $statement = $this->database->prepare(
            'SELECT session_data FROM app_sessions WHERE session_id = ? AND expires_at > ?'
        );
        $statement->execute([$id, time()]);
        $data = $statement->fetchColumn();
        return $data === false ? '' : (string) $data;
    }

    public function write(string $id, string $data): bool
    {
        try {
            $statement = $this->database->prepare(
                'INSERT INTO app_sessions (session_id, session_data, expires_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(session_id) DO UPDATE
                 SET session_data = EXCLUDED.session_data, expires_at = EXCLUDED.expires_at'
            );
            return $statement->execute([$id, $data, time() + (int) ini_get('session.gc_maxlifetime')]);
        } finally {
            $this->releaseLock();
        }
    }

    public function destroy(string $id): bool
    {
        try {
            $statement = $this->database->prepare('DELETE FROM app_sessions WHERE session_id = ?');
            return $statement->execute([$id]);
        } finally {
            $this->releaseLock();
        }
    }

    public function gc(int $max_lifetime): int|false
    {
        $statement = $this->database->prepare('DELETE FROM app_sessions WHERE expires_at <= ?');
        $statement->execute([time()]);
        return $statement->rowCount();
    }

    private function releaseLock(): void
    {
        if ($this->lockedSessionId === null) {
            return;
        }
        $unlock = $this->database->prepare('SELECT pg_advisory_unlock(1789, hashtext(?))');
        $unlock->execute([$this->lockedSessionId]);
        $this->lockedSessionId = null;
    }
}

function clearDropSessionStart(): void
{
    if (getenv('DATABASE_URL') !== false && trim((string) getenv('DATABASE_URL')) !== '') {
        $handler = new ClearDropPostgresSessionHandler(clearDropDatabase());
        if (!session_set_save_handler($handler, true)) {
            throw new RuntimeException('PostgreSQL session storage could not be initialized.');
        }
    }
    session_start();
}
