<?php

namespace Eliyce\MediaPro\Support;

use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Tells a unique index violation apart from other query failures on every
 * supported Laravel version. From Laravel 10.20 on the framework throws
 * UniqueConstraintViolationException; before that only a plain
 * QueryException arrives, so the SQLSTATE and driver error are inspected the
 * way the framework's connections do it.
 *
 * Only unique violations match: other integrity errors share SQLSTATE 23000
 * (NOT NULL, foreign key) and must not be reported as a taken uuid.
 */
class UniqueConstraintViolation
{
    /** Postgres unique_violation. */
    private const SQLSTATE_UNIQUE = '23505';

    /** The SQLSTATE class every integrity constraint violation belongs to. */
    private const SQLSTATE_INTEGRITY_CLASS = '23';

    /** MySQL/MariaDB duplicate entry, SQL Server duplicate key (index, constraint). */
    private const DRIVER_UNIQUE_CODES = [1062, 2601, 2627];

    private const MESSAGE_PATTERN = '#UNIQUE constraint failed|columns? .* (is|are) not unique|Integrity constraint violation: 1062|Cannot insert duplicate key#i';

    public static function matches(QueryException $exception): bool
    {
        // Guarded: the class does not exist before Laravel 10.20.
        if (class_exists(UniqueConstraintViolationException::class)
            && $exception instanceof UniqueConstraintViolationException) {
            return true;
        }

        $errorInfo = is_array($exception->errorInfo) ? $exception->errorInfo : [];
        $sqlState = (string) ($errorInfo[0] ?? $exception->getCode());

        if ($sqlState === self::SQLSTATE_UNIQUE) {
            return true;
        }

        if (! str_starts_with($sqlState, self::SQLSTATE_INTEGRITY_CLASS)) {
            return false;
        }

        if (in_array((int) ($errorInfo[1] ?? 0), self::DRIVER_UNIQUE_CODES, true)) {
            return true;
        }

        $driverMessage = $exception->getPrevious()?->getMessage() ?? $exception->getMessage();

        return (bool) preg_match(self::MESSAGE_PATTERN, $driverMessage);
    }
}
