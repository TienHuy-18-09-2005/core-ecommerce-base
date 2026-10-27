<?php

namespace App\Services\Admin;

use App\Models\Setting;
use Illuminate\Support\Facades\Schema;

/** Thông tin cửa hàng cho phiếu in: config/store.php, ghi đè bằng settings general.store_* (store_name, store_phone…) nếu có (R7 sẽ quản lý). */
class StoreInfo
{
    public static function get(): array
    {
        $info = config('store');
        try {
            if (Schema::hasTable('settings')) {
                Setting::whereIn('key_name', array_map(fn ($k) => "store_$k", array_keys($info)))->get()
                    ->each(function (Setting $s) use (&$info) {
                        if ($s->value !== null && $s->value !== '') {
                            $info[substr($s->key_name, 6)] = $s->value;
                        }
                    });
            }
        } catch (\Throwable) {
            // bảng settings chưa sẵn sàng → dùng config
        }

        return $info;
    }
}
