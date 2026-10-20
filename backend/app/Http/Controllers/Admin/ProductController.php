<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminProductService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    protected AdminProductService $productService;

    public function __construct(AdminProductService $productService)
    {
        $this->productService = $productService;
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $product = $this->productService->createProductWithVariants($request->all());
            return response()->json([
                'success' => true,
                'message' => 'Đã tạo sản phẩm thiết bị điện thành công!',
                'data' => $product
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
