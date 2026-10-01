<?php

namespace Eliyce\MediaPro\Exceptions;

use Exception;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Thrown when a media library request refers to media the current model may
 * not claim: unknown uuids, media owned by another model or collection, or a
 * temporary upload from another session.
 *
 * When it reaches the exception handler it answers like a failed validation
 * (422 JSON error bag, or a redirect back with errors and input) under the
 * `media` key, with a generic message that says nothing about the media.
 */
class InvalidMediaUuid extends Exception
{
    public const ERROR_KEY = 'media';

    final public function __construct(string $message = '', public readonly ?string $uuid = null)
    {
        parent::__construct($message);
    }

    public static function missing(): static
    {
        return new static('A media library request item has no valid `uuid`.');
    }

    public static function create(string $uuid): static
    {
        return new static("The media library request refers to media with uuid `{$uuid}` that cannot be attached to this model.", $uuid);
    }

    public static function duplicate(string $uuid): static
    {
        return new static("The media library request contains uuid `{$uuid}` more than once.", $uuid);
    }

    /**
     * A rejected request is a client error: log it as a warning instead of
     * letting the handler report it as a server error.
     */
    public function report(): void
    {
        Log::warning('media-pro: media library request rejected', [
            'reason' => class_basename($this),
            'uuid' => $this->uuid !== null && Str::isUuid($this->uuid) ? $this->uuid : null,
        ]);
    }

    public function render(Request $request): Response
    {
        return app(ExceptionHandler::class)->render($request, ValidationException::withMessages([
            static::ERROR_KEY => [__('The selected media is invalid.')],
        ]));
    }
}
