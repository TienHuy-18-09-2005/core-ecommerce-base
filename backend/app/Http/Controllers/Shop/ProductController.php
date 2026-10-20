<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Services\Shop\ProductService;
use App\DTOs\Catalog\GetProductsDTO;
use App\Http\Requests\Shop\ListProductsRequest;
use App\Http\Requests\Shop\SuggestProductsRequest;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    public function index(ListProductsRequest $request): JsonResponse
    {
        $dto = GetProductsDTO::fromRequest($request);
        $products = $this->productService->getCatalogProducts($dto);

        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }

    public function suggest(SuggestProductsRequest $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->productService->suggest($request->validated('q')),
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $product = $this->productService->getProductDetail($slug);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy sản phẩm thiết bị điện này.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $product
        ]);
    }
}
