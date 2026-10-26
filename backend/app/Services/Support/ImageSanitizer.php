<?php

namespace App\Services\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Mã hoá lại mọi ảnh (JPEG/PNG/WebP) bằng GD để bỏ toàn bộ metadata (EXIF/GPS/ICC/dữ liệu chèn sau ảnh),
 * xoay theo EXIF Orientation trước khi bỏ. Pha 7.3: khi GD hỗ trợ WebP, mọi ảnh được lưu dạng
 * WebP (nhẹ hơn JPEG/PNG ~25–35%, giữ kênh alpha). Fail closed: ảnh nào không mã hoá lại được → 422, không lưu file gốc.
 */
class ImageSanitizer
{
    public const DISK = 'public';

    public const INVALID_MESSAGE = 'Ảnh không hợp lệ hoặc bị hỏng, vui lòng chọn ảnh JPEG, PNG hoặc WebP khác.';

    /**
     * @param  array<int, UploadedFile>  $files
     * @return array<int, string> đường dẫn trên disk public
     */
    public function storeMany(array $files, string $dir, string $field = 'images'): array
    {
        $encoded = [];
        foreach (array_values($files) as $i => $file) {
            $encoded[] = $this->encodeOrFail($file, "$field.$i");
        }

        return array_map(fn (array $e) => $this->put($dir, ...$e), $encoded);
    }

    public function storeOne(UploadedFile $file, string $dir, string $field = 'image'): string
    {
        return $this->put($dir, ...$this->encodeOrFail($file, $field));
    }

    /** @return array{0: string, 1: string} [ext, bytes] */
    private function encodeOrFail(UploadedFile $file, string $field): array
    {
        $mime = $file->getMimeType();
        $ext = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => null,
        };
        $bytes = $ext === null ? null : $this->reencode($file->getRealPath(), $mime);
        if ($bytes === null) {
            throw ValidationException::withMessages([$field => self::INVALID_MESSAGE]);
        }

        return [self::webpSupported() ? 'webp' : $ext, $bytes];
    }

    private function put(string $dir, string $ext, string $bytes): string
    {
        $path = $dir.'/'.now()->format('Y/m').'/'.Str::random(40).'.'.$ext;
        Storage::disk(self::DISK)->put($path, $bytes);

        return $path;
    }

    private function reencode(string $source, string $mime): ?string
    {
        $img = match ($mime) {
            'image/jpeg' => function_exists('imagecreatefromjpeg') ? @imagecreatefromjpeg($source) : false,
            'image/png' => function_exists('imagecreatefrompng') ? @imagecreatefrompng($source) : false,
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($source) : false,
            default => false,
        };
        if (! $img) {
            return null;
        }
        if ($mime === 'image/jpeg') {
            $img = $this->applyOrientation($img, $source);
        }
        ob_start();
        $ok = self::webpSupported() ? imagepalettetotruecolor($img) && imagesavealpha($img, true) && imagewebp($img, null, 82) : match ($mime) {
            'image/jpeg' => imagejpeg($img, null, 85),
            'image/png' => imagesavealpha($img, true) && imagepng($img, null, 6),
            'image/webp' => imagesavealpha($img, true) && imagewebp($img, null, 85),
        };
        $out = ob_get_clean();
        imagedestroy($img);

        return $ok && $out ? $out : null;
    }

    public static function webpSupported(): bool
    {
        return function_exists('imagewebp') && (gd_info()['WebP Support'] ?? false);
    }

    private function applyOrientation(\GdImage $img, string $source): \GdImage
    {
        $o = function_exists('exif_read_data') ? (int) (@exif_read_data($source)['Orientation'] ?? 1) : 1;
        if (in_array($o, [2, 4, 5, 7], true)) {
            imageflip($img, IMG_FLIP_HORIZONTAL);
        }
        $angle = match ($o) {
            3, 4 => 180,
            5, 6 => 270, // imagerotate quay ngược chiều kim đồng hồ
            7, 8 => 90,
            default => 0,
        };
        if ($angle) {
            $rot = imagerotate($img, $angle, 0);
            if ($rot) {
                imagedestroy($img);
                $img = $rot;
            }
        }

        return $img;
    }
}
