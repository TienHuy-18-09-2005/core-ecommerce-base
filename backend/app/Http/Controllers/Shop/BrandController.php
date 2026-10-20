<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Services\Shop\ProductService;
use Illuminate\Http\JsonResponse;

class BrandController extends Controller
{
    public function __construct(protected ProductService $productService) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->productService->getActiveBrands(),
        ]);
    }
}
