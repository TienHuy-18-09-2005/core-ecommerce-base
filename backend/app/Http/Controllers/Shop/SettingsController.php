<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Services\Support\ShopSettings;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /** GET /settings/public — tên/SĐT/địa chỉ cửa hàng, phí ship và ngưỡng miễn phí. */
    public function public(ShopSettings $settings): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $settings->public()]);
    }
}
