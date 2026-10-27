<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderProductImagesRequest;
use App\Http\Requests\Admin\UploadImageRequest;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Services\Admin\ProductImageService;
use Illuminate\Http\JsonResponse;

class ProductImageController extends Controller
{
    public function __construct(private ProductImageService $images) {}

    public function store(UploadImageRequest $request, Product $product): JsonResponse
    {
        $media = $this->images->add($product, $request->file('image'));

        return response()->json([
            'success' => true,
            'message' => 'Đã tải ảnh lên.',
            'data' => ['id' => $media->id, 'url' => $media->file_url, 'is_primary' => (bool) $media->is_primary, 'images' => $this->images->present($product)],
        ], 201);
    }

    public function reorder(ReorderProductImagesRequest $request, Product $product): JsonResponse
    {
        $this->images->reorder($product, $request->validated('ids'), $request->validated('primary_id'));

        return response()->json(['success' => true, 'message' => 'Đã cập nhật thứ tự ảnh.', 'data' => $this->images->present($product)]);
    }

    public function destroy(Product $product, ProductMedia $media): JsonResponse
    {
        $this->images->remove($product, $media);

        return response()->json(['success' => true, 'message' => 'Đã xóa ảnh.', 'data' => $this->images->present($product)]);
    }
}
