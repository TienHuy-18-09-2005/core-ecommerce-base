<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListAdminProductsRequest;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Http\Requests\Admin\UploadImageRequest;
use App\Models\Product;
use App\Services\Admin\AdminProductService;
use App\Services\Support\ImageSanitizer;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function __construct(private AdminProductService $productService) {}

    public function index(ListAdminProductsRequest $request): JsonResponse
    {
        $page = $this->productService->list($request->validated());

        return $this->paginated($page, fn ($p) => $this->productService->summary($p));
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->productService->detail($product)]);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->createProductWithVariants($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo sản phẩm thành công.',
            'data' => $this->productService->detail($product),
        ], 201);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product = $this->productService->update($product, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Đã lưu sản phẩm.',
            'data' => $this->productService->detail($product),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->productService->delete($product);

        return response()->json(['success' => true, 'message' => 'Đã xóa sản phẩm.']);
    }

    /** Upload ảnh sản phẩm: mã hoá lại để bỏ metadata, trả URL công khai. */
    public function uploadImage(UploadImageRequest $request, ImageSanitizer $images): JsonResponse
    {
        $path = $images->storeOne($request->file('image'), 'products');

        return response()->json([
            'success' => true,
            'message' => 'Đã tải ảnh lên.',
            'data' => ['url' => '/storage/'.$path, 'path' => $path],
        ], 201);
    }
}
