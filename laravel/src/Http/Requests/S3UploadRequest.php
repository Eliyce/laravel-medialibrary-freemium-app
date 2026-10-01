<?php

namespace Eliyce\MediaPro\Http\Requests;

use Eliyce\MediaPro\Http\Requests\Concerns\LogsRejectedUploads;
use Eliyce\MediaPro\Support\MediaProConfig;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class S3UploadRequest extends FormRequest
{
    use LogsRejectedUploads;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Only keys inside the Vapor `tmp/` prefix, without traversal segments.
            'key' => ['required', 'string', 'max:1024', 'regex:#\Atmp/[A-Za-z0-9!_.*\'()\-/]+\z#', 'not_regex:#(\A|/)\.\.?(/|\z)#'],
            'uuid' => ['required', 'string', 'uuid', Rule::unique(MediaProConfig::mediaModel(), 'uuid')],
            'name' => ['nullable', 'string', 'max:255'],
            'content_type' => ['nullable', 'string', 'max:255'],
            'bucket' => ['nullable', 'string', 'max:255'],
        ];
    }
}
