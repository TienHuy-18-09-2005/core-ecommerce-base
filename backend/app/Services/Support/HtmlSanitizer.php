<?php

namespace App\Services\Support;

use HTMLPurifier;
use HTMLPurifier_Config;

/** Làm sạch rich text (mô tả sản phẩm) ở server trước khi lưu: allowlist thẻ/thuộc tính, chỉ link http(s)/mailto. */
class HtmlSanitizer
{
    private ?HTMLPurifier $purifier = null;

    public function clean(?string $html): ?string
    {
        if ($html === null || trim($html) === '') {
            return null;
        }

        return trim($this->purifier()->purify($html)) ?: null;
    }

    private function purifier(): HTMLPurifier
    {
        if ($this->purifier) {
            return $this->purifier;
        }
        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', 'p,br,strong,b,em,i,u,s,ul,ol,li,h2,h3,h4,blockquote,a[href|title],table,thead,tbody,tr,th,td');
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
