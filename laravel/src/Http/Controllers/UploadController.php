<?php

namespace Eliyce\MediaPro\Http\Controllers;

use Eliyce\MediaPro\Http\Requests\UploadRequest;
use Eliyce\MediaPro\Support\MediaProConfig;
use Eliyce\MediaPro\Support\MediaProValue;
use Eliyce\MediaPro\Support\UniqueConstraintViolation;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Spatie\MediaLibrary\MediaCollections\Exceptions\FileCannotBeAdded;

class UploadController extends Controller
{
    public function __invoke(UploadRequest $request): JsonResponse
    {
        $temporaryUploadModel = MediaProConfig::temporaryUploadModel();

        try {
            $temporaryUpload = $temporaryUploadModel::createForFile(
                $request->file('file'),
                $temporaryUploadModel::currentSessionId(),
                (string) $request->validated('uuid'),
                (string) $request->validated('name', ''),
            );
        } catch (FileCannotBeAdded $exception) {
            $request->rejectUpload('file', class_basename($exception), 'The file could not be stored.');
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
}
