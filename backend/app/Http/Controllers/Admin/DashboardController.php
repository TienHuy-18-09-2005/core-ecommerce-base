<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    /** R8: GET /admin/dashboard?range=today|7d|14d|30d — khối dữ liệu lọc theo quyền ở server. */
    public function __invoke(Request $request, DashboardService $dashboard): JsonResponse
    {
        $data = $request->validate(['range' => ['sometimes', 'string', Rule::in(array_keys(DashboardService::RANGES))]]);

        return response()->json(['success' => true, 'data' => $dashboard->forUser($request->user(), $data['range'] ?? DashboardService::DEFAULT_RANGE)]);
    }
}
