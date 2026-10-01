<?php

namespace Eliyce\MediaPro\Tests\Support;

use Eliyce\MediaPro\Concerns\InteractsWithMediaPro;
use Illuminate\Database\Eloquent\Model;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class TestModel extends Model implements HasMedia
{
    use InteractsWithMediaPro;

    protected $table = 'test_models';

    protected $guarded = [];

    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('preview')
            ->fit(Fit::Crop, 100, 100)
            ->keepOriginalImageFormat()
            ->nonQueued();
    }
}
