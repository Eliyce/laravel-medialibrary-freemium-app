<?php

namespace Eliyce\MediaPro\Exceptions;

/**
 * A temporary upload exists for the uuid, but it was created in a different
 * session. It extends InvalidMediaUuid so callers can catch either.
 */
class TemporaryUploadDoesNotBelongToSession extends InvalidMediaUuid
{
    public static function create(string $uuid): static
    {
        return new static("The temporary upload with media uuid `{$uuid}` does not belong to the current session.", $uuid);
    }
}
