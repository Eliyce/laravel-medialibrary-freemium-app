<?php

namespace Eliyce\MediaPro\Rules;

use BadMethodCallException;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

/**
 * Fluent validation builder for a media component value. It expands into
 * flat Laravel rules for the field, `field.*.uuid`, `field.*.name` and
 * `field.*.custom_properties.<key>`.
 *
 * Bounds are inclusive. Size bounds are in kilobytes (1 KB = 1024 bytes).
 */
class MediaRules
{
    protected ?int $minItems = null;

    protected ?int $maxItems = null;

    protected ?int $minItemSizeInKb = null;

    protected ?int $maxItemSizeInKb = null;

    protected ?int $minTotalSizeInKb = null;

    protected ?int $maxTotalSizeInKb = null;

    /** @var list<string> */
    protected array $extensions = [];

    /** @var list<string> */
    protected array $mimeTypes = [];

    protected ?int $minWidth = null;

    protected ?int $maxWidth = null;

    protected ?int $minHeight = null;

    protected ?int $maxHeight = null;

    /** @var array<mixed>|string|null */
    protected array|string|null $itemNameRules = null;

    /** @var array<string, array<mixed>|string> */
    protected array $customPropertyRules = [];

    protected bool $scopedToOwner = false;

    protected ?string $ownerType = null;

    protected ?string $ownerKey = null;

    protected ?string $ownerCollection = null;

    final public function __construct(protected readonly bool $multiple = true)
    {
        if (! $multiple) {
            $this->maxItems = 1;
        }
    }

    public static function single(): static
    {
        return new static(false);
    }

    public static function multiple(): static
    {
        return new static(true);
    }

    /**
     * Expand every MediaRules builder in a rules array into flat rules; other
     * entries pass through unchanged. Use it with Validator::make().
     *
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    public static function expand(array $rules): array
    {
        $expanded = [];

        foreach ($rules as $attribute => $rule) {
            if ($rule instanceof self) {
                $expanded = array_merge($expanded, $rule->toRules((string) $attribute));

                continue;
            }

            $expanded[$attribute] = $rule;
        }

        return $expanded;
    }

    public function minItems(int $minItems): static
    {
        $this->minItems = $this->nonNegative('minItems', $minItems);

        return $this;
    }

    public function maxItems(int $maxItems): static
    {
        if (! $this->multiple && $maxItems > 1) {
            throw new InvalidArgumentException('validateSingleMedia() allows at most one item; use validateMultipleMedia().');
        }

        $this->maxItems = $this->nonNegative('maxItems', $maxItems);

        return $this;
    }

    public function minSizeInKb(int $minSizeInKb): static
    {
        $this->minItemSizeInKb = $this->nonNegative('minSizeInKb', $minSizeInKb);

        return $this;
    }

    public function maxSizeInKb(int $maxSizeInKb): static
    {
        $this->maxItemSizeInKb = $this->nonNegative('maxSizeInKb', $maxSizeInKb);

        return $this;
    }

    public function minItemSizeInKb(int $minItemSizeInKb): static
    {
        return $this->minSizeInKb($minItemSizeInKb);
    }

    public function maxItemSizeInKb(int $maxItemSizeInKb): static
    {
        return $this->maxSizeInKb($maxItemSizeInKb);
    }

    public function minTotalSizeInKb(int $minTotalSizeInKb): static
    {
        $this->ensureMultiple(__FUNCTION__);
        $this->minTotalSizeInKb = $this->nonNegative('minTotalSizeInKb', $minTotalSizeInKb);

        return $this;
    }

    public function maxTotalSizeInKb(int $maxTotalSizeInKb): static
    {
        $this->ensureMultiple(__FUNCTION__);
        $this->maxTotalSizeInKb = $this->nonNegative('maxTotalSizeInKb', $maxTotalSizeInKb);

        return $this;
    }

    /**
     * @param  string|list<string>  $extension
     */
    public function extension(string|array $extension): static
    {
        $this->extensions = $this->normalizeList('extension', $extension, static fn (string $value) => ltrim($value, '.'));

        return $this;
    }

    /**
     * @param  string|list<string>  $mime  exact types or wildcards such as `image/*`
     */
    public function mime(string|array $mime): static
    {
        $this->mimeTypes = $this->normalizeList('mime', $mime, static fn (string $value) => $value);

        return $this;
    }

    /**
     * @param  array<mixed>|string  $rules
     */
    public function itemName(array|string $rules): static
    {
        $this->itemNameRules = $rules;

        return $this;
    }

    /**
     * @param  array<mixed>|string  $rules
     */
    public function customProperty(string $name, array|string $rules): static
    {
        if ($name === '' || str_contains($name, '.') || str_contains($name, '*')) {
            throw new InvalidArgumentException("Invalid custom property name `{$name}`.");
        }

        $this->customPropertyRules[$name] = $rules;

        return $this;
    }

    /**
     * `attribute('name', ...)` validates the item name; any other attribute
     * is treated as a custom property.
     *
     * @param  array<mixed>|string  $rules
     */
    public function attribute(string $name, array|string $rules): static
    {
        return $name === 'name' ? $this->itemName($rules) : $this->customProperty($name, $rules);
    }

    /**
     * Accept existing media only from this model's collection; temporary
     * uploads of the current session stay accepted. Pass null (or an unsaved
     * model) while creating a record: then only temporary uploads pass.
     */
    public function forModel(?Model $model, string $collectionName = 'default'): static
    {
        $this->scopedToOwner = true;
        $this->ownerType = $model?->getMorphClass();
        $this->ownerKey = $model !== null && $model->exists ? (string) $model->getKey() : null;
        $this->ownerCollection = $collectionName;

        return $this;
    }

    public function dimensions(int $width, int $height): static
    {
        return $this->width($width)->height($height);
    }

    public function width(int $width): static
    {
        return $this->widthBetween($width, $width);
    }

    public function height(int $height): static
    {
        return $this->heightBetween($height, $height);
    }

    public function widthBetween(int $minWidth, int $maxWidth): static
    {
        [$this->minWidth, $this->maxWidth] = $this->range('width', $minWidth, $maxWidth);

        return $this;
    }

    public function heightBetween(int $minHeight, int $maxHeight): static
    {
        [$this->minHeight, $this->maxHeight] = $this->range('height', $minHeight, $maxHeight);

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toRules(string $attribute): array
    {
        $fieldRules = [$this->minItems > 0 ? 'required' : 'nullable', 'array'];

        if ($this->minItems !== null) {
            $fieldRules[] = 'min:'.$this->minItems;
        }

        if ($this->maxItems !== null) {
            $fieldRules[] = 'max:'.$this->maxItems;
        }

        if ($this->minTotalSizeInKb !== null || $this->maxTotalSizeInKb !== null) {
            $fieldRules[] = new TotalMediaSize(
                minSizeInKb: $this->minTotalSizeInKb,
                maxSizeInKb: $this->maxTotalSizeInKb,
                scopedToOwner: $this->scopedToOwner,
                ownerType: $this->ownerType,
                ownerKey: $this->ownerKey,
                ownerCollection: $this->ownerCollection,
            );
        }

        $rules = [
            $attribute => $fieldRules,
            "{$attribute}.*" => ['array'],
            "{$attribute}.*.uuid" => ['required', 'string', new UploadedMedia(
                minSizeInKb: $this->minItemSizeInKb,
                maxSizeInKb: $this->maxItemSizeInKb,
                extensions: $this->extensions,
                mimeTypes: $this->mimeTypes,
                minWidth: $this->minWidth,
                maxWidth: $this->maxWidth,
                minHeight: $this->minHeight,
                maxHeight: $this->maxHeight,
                scopedToOwner: $this->scopedToOwner,
                ownerType: $this->ownerType,
                ownerKey: $this->ownerKey,
                ownerCollection: $this->ownerCollection,
            )],
        ];

        if ($this->itemNameRules !== null) {
            $rules["{$attribute}.*.name"] = $this->itemNameRules;
        }

        foreach ($this->customPropertyRules as $name => $propertyRules) {
            $rules["{$attribute}.*.custom_properties.{$name}"] = $propertyRules;
        }

        return $rules;
    }

    protected function ensureMultiple(string $method): void
    {
        if (! $this->multiple) {
            throw new BadMethodCallException("{$method}() is only available on validateMultipleMedia().");
        }
    }

    protected function nonNegative(string $name, int $value): int
    {
        if ($value < 0) {
            throw new InvalidArgumentException("{$name} must be zero or greater, {$value} given.");
        }

        return $value;
    }

    /**
     * @return array{int, int}
     */
    protected function range(string $name, int $min, int $max): array
    {
        $this->nonNegative("minimum {$name}", $min);

        if ($max < $min) {
            throw new InvalidArgumentException("The maximum {$name} ({$max}) is below the minimum ({$min}).");
        }

        return [$min, $max];
    }

    /**
     * @param  string|list<string>  $values
     * @param  callable(string): string  $normalize
     * @return list<string>
     */
    protected function normalizeList(string $name, string|array $values, callable $normalize): array
    {
        $list = [];

        foreach ((array) $values as $value) {
            $value = is_string($value) ? strtolower(trim($normalize(trim($value)))) : '';

            if ($value === '') {
                throw new InvalidArgumentException("{$name}() expects non-empty strings.");
            }

            $list[] = $value;
        }

        if ($list === []) {
            throw new InvalidArgumentException("{$name}() expects at least one value.");
        }

        return array_values(array_unique($list));
    }
}
