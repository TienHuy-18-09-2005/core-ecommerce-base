<?php

namespace App\Services\Support;

use HTMLPurifier;
use HTMLPurifier_Config;

/**
 * Làm sạch rich text (mô tả sản phẩm) ở server — cả khi lưu lẫn khi trả cho shop:
 * allowlist thẻ/thuộc tính, chỉ link http(s)/mailto, ảnh chỉ từ /storage/ của chính cửa hàng,
 * không style/class/on*, không iframe/script/form.
 */
class HtmlSanitizer
{
    private ?HTMLPurifier $purifier = null;

    public function clean(?string $html): ?string
    {
        if ($html === null || trim($html) === '') {
            return null;
        }

        $clean = trim($this->purifier()->purify($html));

        return $this->onlyLocalImages($clean) ?: null;
    }

    /** Ảnh ngoài (theo dõi người xem, nội dung không kiểm soát) bị loại; chỉ giữ ảnh tải lên qua admin. */
    private function onlyLocalImages(string $html): string
    {
        if (stripos($html, '<img') === false) {
            return $html;
        }

        return trim(preg_replace_callback('/<img\b[^>]*>/i', function ($m) {
            return preg_match('/\ssrc="(\/storage\/[A-Za-z0-9._\/-]+)"/', $m[0], $src) && ! str_contains($src[1], '..') ? $m[0] : '';
        }, $html));
    }

    private function purifier(): HTMLPurifier
    {
        if ($this->purifier) {
            return $this->purifier;
        }
        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', 'p,br,hr,strong,b,em,i,u,s,code,pre,ul,ol[start],li,h2,h3,h4,blockquote,a[href|title],img[src|alt|title|width|height],table,thead,tbody,tr,th[colspan|rowspan],td[colspan|rowspan]');
        $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true]);
        $config->set('HTML.TargetBlank', true);
        $config->set('HTML.Nofollow', true);
        $config->set('AutoFormat.RemoveEmpty', true);
        $dir = storage_path('framework/cache/purifier');
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $config->set('Cache.SerializerPath', is_writable($dir) ? $dir : null);
        if (! is_writable($dir)) {
            $config->set('Cache.DefinitionImpl', null);
        }

        return $this->purifier = new HTMLPurifier($config);
    }
}
