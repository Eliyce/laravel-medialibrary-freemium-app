<?php

namespace Eliyce\MediaPro\Http\Controllers;

use Eliyce\MediaPro\Http\Requests\S3UploadRequest;
use Eliyce\MediaPro\Support\MediaProConfig;
use Eliyce\MediaPro\Support\MediaProValue;
use Eliyce\MediaPro\Support\UniqueConstraintViolation;
use finfo;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Exceptions\FileCannotBeAdded;
use Symfony\Component\Mime\MimeTypes;

/**
 * Claims a file the browser already PUT to the `tmp/` prefix of the
 * temporary upload disk (Laravel Vapor flow).
 */
class S3UploadController extends Controller
{
    private const SNIFF_BYTES = 8192;

    /**
     * Plain-text formats libmagic reports as `text/plain`; the client
     * extension decides which one the stored file is.
     */
    private const PLAIN_TEXT_EXTENSIONS = ['txt', 'text', 'csv', 'tsv', 'md', 'markdown', 'json'];

    public function __invoke(S3UploadRequest $request): JsonResponse
    {
        $diskName = MediaProConfig::temporaryUploadDisk();
        $disk = Storage::disk($diskName);
        $key = (string) $request->validated('key');

        if (! $disk->exists($key)) {
            $request->rejectUpload('key', 'Exists', 'The uploaded file could not be found.');
        }

        if ($disk->size($key) > MediaProConfig::maxFileSizeInKb() * 1024) {
            $request->rejectUpload('key', 'Max', 'The file may not be greater than '.MediaProConfig::maxFileSizeInKb().' kilobytes.');
        }

        $name = (string) $request->validated('name', '');
        $extension = $this->storedExtension($disk, $key, $name)
            ?? $request->rejectUpload('key', 'Mimes', 'The file type is not allowed.');

        $baseName = Str::slug(pathinfo($name, PATHINFO_FILENAME)) ?: 'file';
        $temporaryUploadModel = MediaProConfig::temporaryUploadModel();

        try {
            $temporaryUpload = $temporaryUploadModel::createForRemoteFile(
                $key,
                $temporaryUploadModel::currentSessionId(),
                (string) $request->validated('uuid'),
                $name,
                $diskName,
                $baseName.'.'.$extension,
            );
        } catch (FileCannotBeAdded $exception) {
            $request->rejectUpload('key', class_basename($exception), 'The file could not be stored.');
        } catch (QueryException $exception) {
            if (! UniqueConstraintViolation::matches($exception)) {
                throw $exception;
            }

            // A concurrent request took the uuid after validation passed; the
            // model already rolled back the rows and removed the stored files.
            $request->rejectUpload('uuid', 'Unique', 'The uuid has already been taken.');
        }

        return new JsonResponse(MediaProValue::fromMedia($temporaryUpload->getFirstMedia()));
    }

    /**
     * Sniff the stored bytes (never the client-declared content type). The
     * content must map to an allowed extension; the client extension from
     * `name` is kept when it is allowed and matches the content (so a csv
     * stays `.csv` as on the direct upload path), else the sniffed one is used.
     */
    private function storedExtension(Filesystem $disk, string $key, string $name): ?string
    {
        $mimeType = $this->sniffMimeType($disk, $key);

        if ($mimeType === null) {
            return null;
        }

        $mimeTypes = MimeTypes::getDefault();
        $detected = null;

        foreach ($mimeTypes->getExtensions($mimeType) as $extension) {
            if (MediaProConfig::allowsExtension($extension)) {
                $detected = $extension;

                break;
            }
        }

        if ($detected === null) {
            return null;
        }

        $clientExtension = strtolower(pathinfo($name, PATHINFO_EXTENSION));

        if (MediaProConfig::allowsExtension($clientExtension)
            && $this->extensionMatchesContent($clientExtension, $mimeType, $mimeTypes)) {
            return $clientExtension;
        }

        return $detected;
    }

    private function extensionMatchesContent(string $extension, string $mimeType, MimeTypes $mimeTypes): bool
    {
        if (in_array($mimeType, $mimeTypes->getMimeTypes($extension), true)) {
            return true;
        }

        return $mimeType === 'text/plain' && in_array($extension, self::PLAIN_TEXT_EXTENSIONS, true);
    }

    private function sniffMimeType(Filesystem $disk, string $key): ?string
    {
        $stream = $disk->readStream($key);

        if (! is_resource($stream)) {
            return null;
        }

        $head = (string) fread($stream, self::SNIFF_BYTES);
        fclose($stream);

        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->buffer($head);

        return is_string($mimeType) ? $mimeType : null;
    }
}
