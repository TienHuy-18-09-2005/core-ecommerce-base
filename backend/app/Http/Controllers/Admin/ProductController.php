<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Services\Admin\AdminProductService;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    protected AdminProductService $productService;

    public function __construct(AdminProductService $productService)
    {
        $this->productService = $productService;
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->createProductWithVariants($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo sản phẩm thiết bị điện thành công!',
            'data' => $product,
        ], 201);
    }
}
