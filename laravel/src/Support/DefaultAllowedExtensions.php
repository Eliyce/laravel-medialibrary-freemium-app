<?php

namespace Eliyce\MediaPro\Support;

/**
 * The extensions the temporary upload endpoints accept out of the box:
 * common images, documents, archives, audio and video. Executable and
 * script-capable formats (php, html, svg, xml) are deliberately absent.
 */
class DefaultAllowedExtensions
{
    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            // images
            'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'tif', 'tiff', 'ico', 'heic',
            // documents
            'pdf', 'txt', 'csv', 'rtf', 'json', 'md',
            'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
            // archives
            'zip',
            // audio
            'mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac',
            // video
            'mp4', 'm4v', 'mov', 'webm', 'ogv', 'avi', 'mpeg', 'mpg', 'mkv',
        ];
    }
}
