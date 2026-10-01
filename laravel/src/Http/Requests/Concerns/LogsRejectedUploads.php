<?php

namespace Eliyce\MediaPro\Http\Requests\Concerns;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Structured logging for rejected uploads. The entry carries the route, the
 * client uuid (only when it is a well-formed uuid) and the failed rule names;
 * never file contents, file names, tokens or the session id.
 */
trait LogsRejectedUploads
{
    /**
     * @param  array<string, list<string>>  $reason  field => failed rule names
     */
    public function logRejectedUpload(array $reason): void
    {
        $uuid = $this->input('uuid');

        Log::warning('media-pro: upload rejected', [
            'route' => $this->path(),
            'uuid' => is_string($uuid) && Str::isUuid($uuid) ? $uuid : null,
            'reason' => $reason,
        ]);
    }

    /**
     * Log the rejection and answer with Laravel's standard 422 error bag.
     *
     * @throws ValidationException
     */
    public function rejectUpload(string $field, string $rule, string $message): never
    {
        $this->logRejectedUpload([$field => [$rule]]);

        throw ValidationException::withMessages([$field => [$message]]);
    }

    protected function failedValidation(Validator $validator)
    {
        $reason = [];

        foreach ($validator->failed() as $field => $rules) {
            $reason[(string) $field] = array_map('strval', array_keys($rules));
        }

        $this->logRejectedUpload($reason);

        parent::failedValidation($validator);
    }
}
