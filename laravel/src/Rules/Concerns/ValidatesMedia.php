<?php

namespace Eliyce\MediaPro\Rules\Concerns;

use Closure;
use Eliyce\MediaPro\Rules\MediaRules;
use Illuminate\Contracts\Container\Container;
use Illuminate\Foundation\Http\FormRequest;

/**
 * For FormRequests: return `$this->validateSingleMedia()` or
 * `$this->validateMultipleMedia()` builders from rules(); they are expanded
 * into flat Laravel rules when the validator is created.
 */
trait ValidatesMedia
{
    public function validateSingleMedia(): MediaRules
    {
        return MediaRules::single();
    }

    public function validateMultipleMedia(): MediaRules
    {
        return MediaRules::multiple();
    }

    /**
     * Laravel 10.43 and later resolve rules() through this hook.
     *
     * @return array<string, mixed>
     */
    protected function validationRules()
    {
        return MediaRules::expand(parent::validationRules());
    }

    /**
     * Laravel 10.2 to 10.42 have no validationRules() hook and call rules()
     * through the container, so a container method binding expands the
     * builders there. Later versions pass straight through.
     *
     * @return \Illuminate\Contracts\Validation\Validator
     */
    protected function getValidatorInstance()
    {
        if (! method_exists(FormRequest::class, 'validationRules')) {
            $this->container->bindMethod(
                [static::class, 'rules'],
                static fn (FormRequest $request, Container $container): array => MediaRules::expand(
                    $container->call(Closure::fromCallable([$request, 'rules']))
                ),
            );
        }

        return parent::getValidatorInstance();
    }
}
