<?php

namespace Eliyce\MediaPro\Tests\Unit;

use Eliyce\MediaPro\Support\UniqueConstraintViolation;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class UniqueConstraintViolationTest extends TestCase
{
    /**
     * @return array<string, array{string, int, string, bool}>
     */
    public static function driverErrors(): array
    {
        // [SQLSTATE, driver code, driver message, is a unique violation]
        return [
            'pgsql unique' => ['23505', 7, 'duplicate key value violates unique constraint "media_uuid_unique"', true],
            'mysql duplicate entry' => ['23000', 1062, "Duplicate entry 'x' for key 'media_uuid_unique'", true],
            'sqlsrv duplicate key row' => ['23000', 2601, "Cannot insert duplicate key row in object 'dbo.media'", true],
            'sqlsrv duplicate key' => ['23000', 2627, 'Violation of UNIQUE KEY constraint', true],
            'sqlite unique' => ['23000', 19, 'UNIQUE constraint failed: media.uuid', true],
            'sqlite not null' => ['23000', 19, 'NOT NULL constraint failed: media.uuid', false],
            'mysql foreign key' => ['23000', 1452, 'Cannot add or update a child row: a foreign key constraint fails', false],
            'pgsql not null' => ['23502', 7, 'null value in column "uuid" violates not-null constraint', false],
            'missing table' => ['42S02', 1146, "Table 'media' doesn't exist", false],
        ];
    }

    #[DataProvider('driverErrors')]
    public function test_plain_query_exceptions_match_only_unique_violations(string $sqlState, int $code, string $message, bool $expected): void
    {
        $this->assertSame($expected, UniqueConstraintViolation::matches(self::queryException($sqlState, $code, $message)));
    }

    public function test_the_laravel_unique_violation_exception_matches(): void
    {
        if (! class_exists(UniqueConstraintViolationException::class)) {
            $this->markTestSkipped('UniqueConstraintViolationException exists from Laravel 10.20 on.');
        }

        $previous = new PDOException('SQLSTATE[23000]: Integrity constraint violation');

        $this->assertTrue(UniqueConstraintViolation::matches(
            new UniqueConstraintViolationException('testing', 'insert into "media"', [], $previous)
        ));
    }

    private static function queryException(string $sqlState, int $code, string $message): QueryException
    {
        $previous = new PDOException("SQLSTATE[{$sqlState}]: Integrity constraint violation: {$code} {$message}");
        $previous->errorInfo = [$sqlState, $code, $message];

        return new QueryException('testing', 'insert into "media" ("uuid") values (?)', ['x'], $previous);
    }
}
