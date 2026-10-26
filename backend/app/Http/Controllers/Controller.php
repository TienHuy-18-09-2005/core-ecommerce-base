<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

abstract class Controller
{
    /** Envelope phân trang chuẩn: {success, data, meta}. */
    protected function paginated(LengthAwarePaginator $page, callable $map): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => collect($page->items())->map($map)->values()->all(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }
}
