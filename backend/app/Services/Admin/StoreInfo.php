<?php

namespace App\Services\Admin;

use App\Services\Support\ShopSettings;

/** Thông tin cửa hàng cho phiếu in: cài đặt R7 (bảng settings), mặc định config/store.php. */
class StoreInfo
{
    public static function get(): array
    {
        $s = app(ShopSettings::class)->all();

        return [
            'name' => $s['store_name'],
            'phone' => $s['store_phone'] !== '' ? $s['store_phone'] : null,
            'address' => $s['store_address'] !== '' ? $s['store_address'] : null,
            'email' => $s['store_email'] !== '' ? $s['store_email'] : null,
        ];
    }
}
