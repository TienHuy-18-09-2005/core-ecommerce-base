<?php

namespace App\Support;

/** Chỉ nhận ảnh đã upload (/storage/...) hoặc URL http(s); chặn javascript:, data:, ... */
final class ImageUrlRule
{
    public const REGEX = 'regex:#^(/storage/[A-Za-z0-9/_.\-]+|https?://[^\s"<>]+)$#';
}
