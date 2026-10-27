<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkProductRequest;
use App\Http\Requests\Admin\ListAdminProductsRequest;
use App\Http\Requests\Admin\UploadImageRequest;
use App\Services\Support\ImageSanitizer;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Models\Product;
use App\Services\Admin\AdminProductService;
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

    public function bulk(BulkProductRequest $request): JsonResponse
    {
        $d = $request->validated();
        $res = $this->productService->bulk(array_map('intval', $d['ids']), $d['action'], $d['status'] ?? null, isset($d['category_id']) ? (int) $d['category_id'] : null);

        return response()->json([
            'success' => true,
            'message' => "Đã cập nhật {$res['succeeded']}/".count($res['results']).' sản phẩm.',
            'data' => $res,
        ]);
    }

    public function duplicate(Product $product): JsonResponse
    {
        $copy = $this->productService->duplicate($product);

        return response()->json(['success' => true, 'message' => 'Đã nhân bản sản phẩm (bản nháp).', 'data' => $this->productService->detail($copy)], 201);
    }

    /** Ảnh chèn trong mô tả: mã hoá lại + bỏ EXIF như ảnh sản phẩm, không thuộc bộ sưu tập ảnh. */
    public function descriptionImage(UploadImageRequest $request, ImageSanitizer $images): JsonResponse
    {
        $path = $images->storeOne($request->file('image'), 'products/description');

        return response()->json(['success' => true, 'data' => ['url' => '/storage/'.$path]], 201);
    }
}
