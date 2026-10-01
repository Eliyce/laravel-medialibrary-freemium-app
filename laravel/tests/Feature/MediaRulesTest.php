<?php

namespace Eliyce\MediaPro\Tests\Feature;

use BadMethodCallException;
use Closure;
use Eliyce\MediaPro\Rules\MediaRules;
use Eliyce\MediaPro\Rules\TotalMediaSize;
use Eliyce\MediaPro\Rules\UploadedMedia;
use Eliyce\MediaPro\Tests\Support\StoreImagesRequest;
use Eliyce\MediaPro\Tests\Support\TestModel;
use Eliyce\MediaPro\Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\InvokableValidationRule;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use ReflectionMethod;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MediaRulesTest extends TestCase
{
    /** AC-56 */
    public function test_form_request_builders_expand_into_flat_rules(): void
    {
        $uuid = $this->upload()->uuid;
        $validator = $this->validatorFor(StoreImagesRequest::class, ['images' => [$uuid => ['uuid' => $uuid, 'name' => 'x']]]);
        $rules = $validator->getRules();

        $this->assertSame(['required', 'array', 'min:1', 'max:5'], $rules['images']);
        $this->assertSame(['nullable', 'string'], $rules['title']);
        $this->assertSame('required', $rules["images.{$uuid}.uuid"][0]);

        $uploadedMedia = collect($rules["images.{$uuid}.uuid"])
            ->map(fn ($rule) => $rule instanceof InvokableValidationRule ? $rule->invokable() : $rule)
            ->first(fn ($rule) => $rule instanceof UploadedMedia);
        $this->assertInstanceOf(UploadedMedia::class, $uploadedMedia);
        $this->assertSame(['png'], $uploadedMedia->extensions);
        $this->assertSame(1024, $uploadedMedia->maxSizeInKb);
        $this->assertSame(['required'], $rules["images.{$uuid}.name"]);
        $this->assertTrue($validator->passes());
    }

    /** AC-56 */
    public function test_form_request_reports_failures_on_item_keys(): void
    {
        $uuid = $this->upload()->uuid;
        $request = $this->formRequest(StoreImagesRequest::class, ['images' => [$uuid => ['uuid' => $uuid, 'name' => '']]]);

        try {
            $request->validateResolved();
            $this->fail('Expected a validation failure.');
        } catch (ValidationException $exception) {
            $this->assertSame(["images.{$uuid}.name"], array_keys($exception->errors()));
        }
    }

    /** AC-60 */
    public function test_expand_matches_the_form_request_path(): void
    {
        $good = $this->upload()->uuid;
        $pdf = $this->upload($this->pdf())->uuid;
        $data = ['images' => [
            $good => ['uuid' => $good, 'name' => 'ok'],
            $pdf => ['uuid' => $pdf],
        ]];

        $manual = Validator::make($data, MediaRules::expand([
            'title' => ['nullable', 'string'],
            'images' => MediaRules::multiple()->minItems(1)->maxItems(5)->extension('png')->maxItemSizeInKb(1024)->attribute('name', 'required'),
        ]));
        $viaRequest = $this->validatorFor(StoreImagesRequest::class, $data);

        $this->assertTrue($manual->fails());
        $this->assertEqualsCanonicalizing(["images.{$pdf}.uuid", "images.{$pdf}.name"], $manual->errors()->keys());
        $this->assertSame($manual->errors()->toArray(), $viaRequest->errors()->toArray());
    }

    public function test_expand_leaves_other_rules_untouched(): void
    {
        $this->assertSame(['title' => 'required|string'], MediaRules::expand(['title' => 'required|string']));
    }

    /**
     * One fixture per builder method. Each yields [builder, failing value factory key, expected error key suffix].
     *
     * @return array<string, array{Closure(): MediaRules, array{size?: int, width?: int, height?: int, mime?: string, count?: int, name?: string, alt?: mixed}, array{size?: int, width?: int, height?: int, mime?: string, count?: int, name?: string, alt?: mixed}, string}>
     */
    public static function ruleFixtures(): array
    {
        // [builder, passing-at-bound fixture, failing fixture, error key ('' = field, otherwise item suffix)]
        return [
            'minItems' => [fn () => MediaRules::multiple()->minItems(2), ['count' => 2], ['count' => 1], ''],
            'maxItems' => [fn () => MediaRules::multiple()->maxItems(2), ['count' => 2], ['count' => 3], ''],
            'minSizeInKb' => [fn () => MediaRules::multiple()->minSizeInKb(10), ['size' => 10 * 1024], ['size' => 10 * 1024 - 1], 'uuid'],
            'maxSizeInKb' => [fn () => MediaRules::multiple()->maxSizeInKb(10), ['size' => 10 * 1024], ['size' => 10 * 1024 + 1], 'uuid'],
            'minItemSizeInKb' => [fn () => MediaRules::multiple()->minItemSizeInKb(5), ['size' => 5 * 1024], ['size' => 5 * 1024 - 1], 'uuid'],
            'maxItemSizeInKb' => [fn () => MediaRules::multiple()->maxItemSizeInKb(5), ['size' => 5 * 1024], ['size' => 5 * 1024 + 1], 'uuid'],
            'extension string' => [fn () => MediaRules::multiple()->extension('png'), [], ['mime' => 'application/pdf'], 'uuid'],
            'extension array' => [fn () => MediaRules::multiple()->extension(['jpg', 'png']), [], ['mime' => 'application/pdf'], 'uuid'],
            'mime string' => [fn () => MediaRules::multiple()->mime('image/png'), [], ['mime' => 'application/pdf'], 'uuid'],
            'mime array with wildcard' => [fn () => MediaRules::multiple()->mime(['application/pdf', 'image/*']), [], ['mime' => 'text/plain'], 'uuid'],
            'itemName' => [fn () => MediaRules::multiple()->itemName('required|max:5'), ['name' => 'abcde'], ['name' => 'abcdef'], 'name'],
            'customProperty' => [fn () => MediaRules::multiple()->customProperty('alt', ['required', 'max:3']), ['alt' => 'abc'], ['alt' => 'abcd'], 'custom_properties.alt'],
            'attribute as custom property' => [fn () => MediaRules::multiple()->attribute('alt', 'required'), ['alt' => 'x'], ['alt' => ''], 'custom_properties.alt'],
            'attribute as name' => [fn () => MediaRules::multiple()->attribute('name', 'required'), ['name' => 'x'], ['name' => ''], 'name'],
            'dimensions' => [fn () => MediaRules::multiple()->dimensions(40, 30), ['width' => 40, 'height' => 30], ['width' => 40, 'height' => 31], 'uuid'],
            'width' => [fn () => MediaRules::multiple()->width(40), ['width' => 40, 'height' => 99], ['width' => 41], 'uuid'],
            'height' => [fn () => MediaRules::multiple()->height(30), ['height' => 30, 'width' => 99], ['height' => 29], 'uuid'],
            'widthBetween min' => [fn () => MediaRules::multiple()->widthBetween(20, 40), ['width' => 20], ['width' => 19], 'uuid'],
            'widthBetween max' => [fn () => MediaRules::multiple()->widthBetween(20, 40), ['width' => 40], ['width' => 41], 'uuid'],
            'heightBetween min' => [fn () => MediaRules::multiple()->heightBetween(20, 40), ['height' => 20], ['height' => 19], 'uuid'],
            'heightBetween max' => [fn () => MediaRules::multiple()->heightBetween(20, 40), ['height' => 40], ['height' => 41], 'uuid'],
            'minTotalSizeInKb' => [fn () => MediaRules::multiple()->minTotalSizeInKb(20), ['count' => 2, 'size' => 10 * 1024], ['count' => 2, 'size' => 10 * 1024 - 1], ''],
            'maxTotalSizeInKb' => [fn () => MediaRules::multiple()->maxTotalSizeInKb(20), ['count' => 2, 'size' => 10 * 1024], ['count' => 2, 'size' => 10 * 1024 + 1], ''],
        ];
    }

    /** AC-57 */
    #[DataProvider('ruleFixtures')]
    public function test_each_rule_passes_at_its_bound_and_fails_beyond_it(Closure $builder, array $passing, array $failing, string $errorKey): void
    {
        $pass = $this->value($passing);
        $passingValidator = Validator::make($pass['data'], MediaRules::expand(['images' => $builder()]));
        $this->assertTrue($passingValidator->passes(), 'Expected the bound fixture to pass: '.json_encode($passingValidator->errors()->toArray()));

        $fail = $this->value($failing);
        $failingValidator = Validator::make($fail['data'], MediaRules::expand(['images' => $builder()]));
        $expectedKey = $errorKey === '' ? 'images' : "images.{$fail['first']}.{$errorKey}";

        $this->assertTrue($failingValidator->fails());
        $this->assertSame([$expectedKey], $failingValidator->errors()->keys());
    }

    /** AC-58 */
    public function test_single_media_allows_at_most_one_item(): void
    {
        $first = $this->upload()->uuid;
        $second = $this->upload()->uuid;

        $one = Validator::make(['avatar' => [$first => ['uuid' => $first]]], MediaRules::expand(['avatar' => MediaRules::single()]));
        $this->assertTrue($one->passes());

        $two = Validator::make(
            ['avatar' => [$first => ['uuid' => $first], $second => ['uuid' => $second]]],
            MediaRules::expand(['avatar' => MediaRules::single()])
        );
        $this->assertSame(['avatar'], $two->errors()->keys());
    }

    /** AC-58 */
    public function test_total_size_rules_are_multiple_only(): void
    {
        $request = new StoreImagesRequest;

        try {
            $request->validateSingleMedia()->minTotalSizeInKb(1);
            $this->fail('Expected BadMethodCallException.');
        } catch (BadMethodCallException) {
        }

        $this->expectException(BadMethodCallException::class);
        $request->validateSingleMedia()->maxTotalSizeInKb(1);
    }

    public function test_single_media_rejects_a_max_items_above_one(): void
    {
        $this->expectException(InvalidArgumentException::class);

        MediaRules::single()->maxItems(2);
    }

    public function test_invalid_bounds_are_rejected_at_the_boundary(): void
    {
        $this->expectException(InvalidArgumentException::class);

        MediaRules::multiple()->widthBetween(50, 10);
    }

    /** AC-59, INV-1 */
    public function test_unknown_uuids_and_other_sessions_fail_on_the_uuid_key(): void
    {
        $unknown = '0b8f6c1e-1111-4111-8111-111111111111';
        $foreign = $this->mediaOf($this->createTemporaryUpload(sessionId: 'another-session'))->uuid;

        $validator = Validator::make(['images' => [
            $unknown => ['uuid' => $unknown],
            $foreign => ['uuid' => $foreign],
        ]], MediaRules::expand(['images' => MediaRules::multiple()]));

        $this->assertEqualsCanonicalizing(["images.{$unknown}.uuid", "images.{$foreign}.uuid"], $validator->errors()->keys());
    }

    public function test_failure_messages_fill_their_placeholders(): void
    {
        $fixture = $this->value(['size' => 10 * 1024 + 1]);
        $validator = Validator::make($fixture['data'], MediaRules::expand(['images' => MediaRules::multiple()->maxSizeInKb(10)]));

        $this->assertSame(
            ["The images.{$fixture['first']}.uuid may not be greater than 10 kilobytes."],
            $validator->errors()->get("images.{$fixture['first']}.uuid")
        );
    }

    public function test_media_already_attached_to_a_model_is_accepted(): void
    {
        $model = TestModel::create();
        $media = $model->addMedia(UploadedFile::fake()->image('a.png', 10, 10))->toMediaCollection('images');

        $validator = Validator::make(['images' => [['uuid' => $media->uuid]]], MediaRules::expand(['images' => MediaRules::multiple()->extension('png')]));

        $this->assertTrue($validator->passes());
    }

    /** INV-1 */
    public function test_for_model_accepts_existing_media_only_from_that_models_collection(): void
    {
        $model = TestModel::create();
        $own = $model->addMedia(UploadedFile::fake()->image('own.png', 10, 10))->toMediaCollection('images');
        $ownDoc = $model->addMedia($this->pdf())->toMediaCollection('docs');
        $theirs = TestModel::create()->addMedia(UploadedFile::fake()->image('theirs.png', 10, 10))->toMediaCollection('images');
        $upload = $this->upload()->uuid;

        $validator = Validator::make(['images' => [
            ['uuid' => $own->uuid],
            ['uuid' => $upload],
            ['uuid' => $ownDoc->uuid],
            ['uuid' => $theirs->uuid],
        ]], MediaRules::expand(['images' => MediaRules::multiple()->forModel($model, 'images')]));

        $this->assertEqualsCanonicalizing(['images.2.uuid', 'images.3.uuid'], $validator->errors()->keys());
    }

    /** INV-1: foreign media fails with the generic message alone, revealing nothing about its size or type. */
    public function test_foreign_media_fails_before_the_size_type_and_dimension_checks(): void
    {
        $model = TestModel::create();
        $theirs = TestModel::create()->addMedia($this->pdf())->toMediaCollection('images');

        $validator = Validator::make(['images' => [['uuid' => $theirs->uuid]]], MediaRules::expand([
            'images' => MediaRules::multiple()->forModel($model, 'images')->extension('png')->maxSizeInKb(0)->dimensions(1, 1),
        ]));

        $this->assertSame(['The images.0.uuid must refer to an uploaded file.'], $validator->errors()->get('images.0.uuid'));
    }

    public function test_for_model_without_a_saved_model_accepts_only_temporary_uploads(): void
    {
        $existing = TestModel::create()->addMedia(UploadedFile::fake()->image('a.png', 10, 10))->toMediaCollection('images');
        $upload = $this->upload()->uuid;
        $data = ['images' => [['uuid' => $upload], ['uuid' => $existing->uuid]]];

        foreach ([null, new TestModel] as $owner) {
            $validator = Validator::make($data, MediaRules::expand(['images' => MediaRules::multiple()->forModel($owner, 'images')]));

            $this->assertSame(['images.1.uuid'], $validator->errors()->keys());
        }
    }

    public function test_form_request_builders_accept_an_owner_scope(): void
    {
        $model = TestModel::create();
        $theirs = TestModel::create()->addMedia(UploadedFile::fake()->image('theirs.png', 10, 10))->toMediaCollection('images');
        $request = new StoreImagesRequest;

        $validator = Validator::make(
            ['avatar' => [['uuid' => $theirs->uuid]]],
            MediaRules::expand(['avatar' => $request->validateSingleMedia()->forModel($model, 'avatar')])
        );

        $this->assertSame(['avatar.0.uuid'], $validator->errors()->keys());
    }

    /** INV-1: a temporary upload of another session adds nothing to the total. */
    public function test_total_size_counts_only_uploads_of_the_current_session(): void
    {
        $own = $this->sized($this->upload(), 10 * 1024);
        $foreign = $this->sized($this->mediaOf($this->createTemporaryUpload(sessionId: 'another-session')), 100 * 1024);
        $data = ['images' => [
            $own->uuid => ['uuid' => $own->uuid],
            $foreign->uuid => ['uuid' => $foreign->uuid],
        ]];

        $max = Validator::make($data, MediaRules::expand(['images' => MediaRules::multiple()->maxTotalSizeInKb(20)]));
        $this->assertSame(["images.{$foreign->uuid}.uuid"], $max->errors()->keys());

        $min = Validator::make($data, MediaRules::expand(['images' => MediaRules::multiple()->minTotalSizeInKb(11)]));
        $this->assertEqualsCanonicalizing(['images', "images.{$foreign->uuid}.uuid"], $min->errors()->keys());
    }

    /** INV-1: with forModel(), media outside that model's collection adds nothing to the total. */
    public function test_total_size_counts_only_media_the_owner_scope_accepts(): void
    {
        $model = TestModel::create();
        $own = $this->sized($model->addMedia(UploadedFile::fake()->image('own.png', 10, 10))->toMediaCollection('images'), 10 * 1024);
        $ownDoc = $this->sized($model->addMedia($this->pdf())->toMediaCollection('docs'), 100 * 1024);
        $theirs = $this->sized(TestModel::create()->addMedia(UploadedFile::fake()->image('theirs.png', 10, 10))->toMediaCollection('images'), 100 * 1024);
        $upload = $this->sized($this->upload(), 10 * 1024);
        $data = ['images' => [
            ['uuid' => $own->uuid],
            ['uuid' => $upload->uuid],
            ['uuid' => $ownDoc->uuid],
            ['uuid' => $theirs->uuid],
        ]];

        $max = Validator::make($data, MediaRules::expand(['images' => MediaRules::multiple()->forModel($model, 'images')->maxTotalSizeInKb(20)]));
        $this->assertEqualsCanonicalizing(['images.2.uuid', 'images.3.uuid'], $max->errors()->keys());

        $min = Validator::make($data, MediaRules::expand(['images' => MediaRules::multiple()->forModel($model, 'images')->minTotalSizeInKb(21)]));
        $this->assertEqualsCanonicalizing(['images', 'images.2.uuid', 'images.3.uuid'], $min->errors()->keys());

        $unscoped = Validator::make($data, MediaRules::expand(['images' => MediaRules::multiple()->maxTotalSizeInKb(20)]));
        $this->assertSame(['images'], $unscoped->errors()->keys());
    }

    public function test_total_size_rule_reveals_nothing_about_foreign_media(): void
    {
        $model = TestModel::create();
        $theirs = $this->sized(TestModel::create()->addMedia(UploadedFile::fake()->image('theirs.png', 10, 10))->toMediaCollection('images'), 100 * 1024);
        $foreign = $this->sized($this->mediaOf($this->createTemporaryUpload(sessionId: 'another-session')), 100 * 1024);
        $value = [['uuid' => $theirs->uuid], ['uuid' => $foreign->uuid]];

        $rule = new TotalMediaSize(
            maxSizeInKb: 1,
            scopedToOwner: true,
            ownerType: $model->getMorphClass(),
            ownerKey: (string) $model->getKey(),
            ownerCollection: 'images',
        );

        $this->assertTrue(Validator::make(['images' => $value], ['images' => [$rule]])->passes());
    }

    public function test_items_are_resolved_with_a_fixed_number_of_queries(): void
    {
        $data = ['images' => []];
        foreach (range(1, 5) as $ignored) {
            $uuid = $this->upload()->uuid;
            $data['images'][$uuid] = ['uuid' => $uuid];
        }

        DB::enableQueryLog();
        Validator::make($data, MediaRules::expand(['images' => MediaRules::multiple()->maxSizeInKb(100)]))->passes();

        $this->assertLessThanOrEqual(2, count(DB::getQueryLog()));
    }

    /**
     * Build a value of `count` temporary uploads, each adjusted to the fixture.
     *
     * @param  array{size?: int, width?: int, height?: int, mime?: string, count?: int, name?: string, alt?: mixed}  $fixture
     * @return array{data: array<string, mixed>, first: string}
     */
    private function value(array $fixture): array
    {
        $items = [];

        foreach (range(1, $fixture['count'] ?? 1) as $ignored) {
            $file = UploadedFile::fake()->image('item.png', $fixture['width'] ?? 40, $fixture['height'] ?? 30);
            $media = $this->upload($file);

            $media->forceFill(array_filter([
                'size' => $fixture['size'] ?? null,
                'mime_type' => $fixture['mime'] ?? null,
                'file_name' => isset($fixture['mime']) ? 'item.'.explode('/', $fixture['mime'])[1] : null,
            ], fn ($value) => $value !== null))->save();

            $items[$media->uuid] = [
                'uuid' => $media->uuid,
                'name' => $fixture['name'] ?? 'item',
                'custom_properties' => ['alt' => $fixture['alt'] ?? 'alt'],
            ];
        }

        return ['data' => ['images' => $items], 'first' => (string) array_key_first($items)];
    }

    private function sized(Media $media, int $bytes): Media
    {
        $media->forceFill(['size' => $bytes])->save();

        return $media;
    }

    private function upload(?UploadedFile $file = null): Media
    {
        return $this->mediaOf($this->createTemporaryUpload(file: $file));
    }

    /**
     * @param  class-string<\Illuminate\Foundation\Http\FormRequest>  $class
     * @param  array<string, mixed>  $data
     */
    private function formRequest(string $class, array $data): \Illuminate\Foundation\Http\FormRequest
    {
        $request = $class::createFrom(Request::create('/images', 'POST', $data));
        $request->setContainer($this->app)->setRedirector($this->app['redirect']);

        return $request;
    }

    /**
     * @param  class-string<\Illuminate\Foundation\Http\FormRequest>  $class
     * @param  array<string, mixed>  $data
     */
    private function validatorFor(string $class, array $data): \Illuminate\Validation\Validator
    {
        $method = new ReflectionMethod($class, 'getValidatorInstance');

        return $method->invoke($this->formRequest($class, $data));
    }
}
