<?php

return [

    /*
     * The model that holds files uploaded by the media components before the
     * form is submitted. It must extend Eliyce\MediaPro\Models\TemporaryUpload.
     */
    'temporary_upload_model' => Eliyce\MediaPro\Models\TemporaryUpload::class,

    /*
     * Only files whose content matches one of these extensions are accepted by
     * the upload endpoints. Add your own or spread the defaults:
     * [...Eliyce\MediaPro\Support\DefaultAllowedExtensions::all(), 'heic']
     */
    'temporary_uploads_allowed_extensions' => Eliyce\MediaPro\Support\DefaultAllowedExtensions::all(),

    /*
     * The maximum size of a single upload in kilobytes. When null, the
     * `media-library.max_file_size` value (in bytes) is used.
     */
    'max_file_size_in_kb' => null,

    /*
     * `php artisan media-pro:delete-old-temporary-uploads` removes temporary
     * uploads older than this many hours.
     */
    'delete_temporary_uploads_older_than_hours' => 24,

    /*
     * The disk temporary uploads are stored on. When null, the
     * `media-library.disk_name` disk is used. The s3 endpoint also reads the
     * `tmp/` keys created by Vapor from this disk.
     */
    'temporary_upload_disk' => null,

    /*
     * Files on a private disk get temporary signed URLs (`preview_url` and
     * `original_url`) valid for this many minutes. A disk is private when its
     * `visibility` is not `public` and it can sign URLs, like a private S3
     * bucket. Set to null to always return plain URLs.
     */
    'signed_url_expiration_minutes' => 60,

    /*
     * Uploads allowed per minute per IP address by the default
     * `media-pro-uploads` rate limiter. Define your own limiter with that name
     * to replace it entirely.
     */
    'rate_limit_per_minute' => 10,

];
