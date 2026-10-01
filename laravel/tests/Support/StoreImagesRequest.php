<?php

namespace Eliyce\MediaPro\Tests\Support;

use Eliyce\MediaPro\Rules\Concerns\ValidatesMedia;
use Illuminate\Foundation\Http\FormRequest;

class StoreImagesRequest extends FormRequest
{
    use ValidatesMedia;

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
            'title' => ['nullable', 'string'],
            'images' => $this
                ->validateMultipleMedia()
                ->minItems(1)
                ->maxItems(5)
                ->extension('png')
                ->maxItemSizeInKb(1024)
                ->attribute('name', 'required'),
        ];
    }
}
