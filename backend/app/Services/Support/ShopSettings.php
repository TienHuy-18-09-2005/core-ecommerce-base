<?php

namespace App\Services\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Cài đặt cửa hàng (R7): bảng settings key–value, cache theo khóa CACHE_KEY, mặc định lấy từ config/store.php + config/shop.php.
 * Mọi nơi tính phí ship / in phiếu đều đọc qua đây; ghi bằng update() sẽ xóa cache.
 */
class ShopSettings
{
    public const CACHE_KEY = 'settings:shop';

    /** key => [group, kiểu] */
    public const KEYS = [
        'store_name' => ['general', 'string'],
        'store_phone' => ['general', 'string'],
        'store_address' => ['general', 'string'],
        'store_email' => ['general', 'string'],
        'shipping_fee' => ['shipping', 'int'],
        'free_shipping_threshold' => ['shipping', 'int'],
    ];

    public function defaults(): array
    {
        return [
            'store_name' => (string) config('store.name'),
            'store_phone' => (string) config('store.phone'),
            'store_address' => (string) config('store.address'),
            'store_email' => (string) config('store.email'),
            'shipping_fee' => (int) config('shop.shipping_fee'),
            'free_shipping_threshold' => (int) config('shop.free_shipping_threshold', 0),
        ];
    }

    /** Toàn bộ cài đặt hiệu lực (DB đè mặc định). */
    public function all(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, function () {
            try {
                if (! Schema::hasTable('settings')) {
                    return [];
                }

                return Setting::whereIn('key_name', array_keys(self::KEYS))->pluck('value', 'key_name')->all();
            } catch (\Throwable) {
                return [];
            }
        });
        $out = $this->defaults();
        foreach ($stored as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $out[$key] = self::KEYS[$key][1] === 'int' ? (int) $value : (string) $value;
        }

        return $out;
    }

    public function get(string $key): mixed
    {
        return $this->all()[$key] ?? null;
    }

    /** Ghi các khóa hợp lệ, trả về [before, after]; xóa cache. */
    public function update(array $values): array
    {
        $before = $this->all();
        foreach ($values as $key => $value) {
            if (! isset(self::KEYS[$key])) {
                continue;
            }
            Setting::updateOrCreate(['key_name' => $key], ['group_name' => self::KEYS[$key][0], 'value' => $value === null ? null : (string) $value]);
        }
        $this->flush();

        return [$before, $this->all()];
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /** Phí ship cho tạm tính (trước giảm giá): 0 khi giỏ rỗng hoặc đạt ngưỡng miễn phí. */
    public function shippingFor(float $subtotal, bool $empty = false): float
    {
        if ($empty) {
            return 0.0;
        }
        $threshold = (int) $this->get('free_shipping_threshold');
        if ($threshold > 0 && $subtotal >= $threshold) {
            return 0.0;
        }

        return (float) $this->get('shipping_fee');
    }

    /** Thông tin công khai cho shop (footer, giỏ, checkout). */
    public function public(): array
    {
        $a = $this->all();

        return [
            'store' => ['name' => $a['store_name'], 'phone' => $a['store_phone'] ?: null, 'address' => $a['store_address'] ?: null, 'email' => $a['store_email'] ?: null],
            'shipping' => ['fee' => $a['shipping_fee'], 'free_threshold' => $a['free_shipping_threshold'] ?: null],
        ];
    }
}
