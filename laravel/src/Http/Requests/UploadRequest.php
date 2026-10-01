<?php

namespace Eliyce\MediaPro\Http\Requests;

use Closure;
use Eliyce\MediaPro\Http\Requests\Concerns\LogsRejectedUploads;
use Eliyce\MediaPro\Support\MediaProConfig;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;

class UploadRequest extends FormRequest
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
            'file' => [
                'required',
                'file',
                'mimes:'.implode(',', MediaProConfig::allowedExtensions()),
                'max:'.MediaProConfig::maxFileSizeInKb(),
                static function (string $attribute, mixed $value, Closure $fail): void {
                    // `mimes` checks the content; the stored name keeps the client
                    // extension, so it must be on the allow-list too.
                    if ($value instanceof UploadedFile
                        && ! MediaProConfig::allowsExtension($value->getClientOriginalExtension())) {
                        $fail('The :attribute extension is not allowed.')->translate();
                    }
                },
            ],
            'uuid' => ['required', 'string', 'uuid', Rule::unique(MediaProConfig::mediaModel(), 'uuid')],
            'name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
