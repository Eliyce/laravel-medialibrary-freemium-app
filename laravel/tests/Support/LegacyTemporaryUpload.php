<?php

namespace Eliyce\MediaPro\Tests\Support;

use Closure;
use Eliyce\MediaPro\Models\TemporaryUpload;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Behaves like Laravel 10.2 to 10.19, which raise a plain QueryException for
 * a unique index violation instead of UniqueConstraintViolationException.
 */
class LegacyTemporaryUpload extends TemporaryUpload
{
    /**
     * @param  Closure(TemporaryUpload): Media  $addMedia
     */
    protected static function storeAtomically(string $sessionId, string $uuid, Closure $addMedia): static
    {
        try {
            return parent::storeAtomically($sessionId, $uuid, $addMedia);
        } catch (UniqueConstraintViolationException $exception) {
            throw new QueryException($exception->connectionName, $exception->getSql(), $exception->getBindings(), $exception->getPrevious());
        }
    }
}
