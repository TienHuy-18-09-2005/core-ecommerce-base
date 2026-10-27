<?php

namespace App\Services\Admin;

use App\Models\Product;
use App\Models\ProductMedia;
use App\Services\Support\AuditLogger;
use App\Services\Support\ImageSanitizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Ảnh sản phẩm: tải file (mã hoá lại, bỏ EXIF/GPS, lưu WebP), sắp thứ tự, chọn ảnh chính, xóa kèm file.
 * Ảnh chính luôn được đồng bộ sang products.thumbnail_url để shop/giỏ/đơn hiển thị đúng.
 */
class ProductImageService
{
    public const MAX_IMAGES = 10;

    public function __construct(private ImageSanitizer $images, private AuditLogger $audit) {}

    /** @return array<int, array<string, mixed>> */
    public function present(Product $p): array
    {
        return $p->media()->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (ProductMedia $m) => [
                'id' => $m->id,
                'url' => $m->file_url,
                'alt_text' => $m->alt_text,
                'sort_order' => $m->sort_order,
                'is_primary' => (bool) $m->is_primary,
            ])->values()->all();
    }

    public function add(Product $product, UploadedFile $file): ProductMedia
    {
        if ($product->media()->count() >= self::MAX_IMAGES) {
            throw ValidationException::withMessages(['image' => 'Mỗi sản phẩm tối đa '.self::MAX_IMAGES.' ảnh.']);
        }
        $path = $this->images->storeOne($file, 'products');

        try {
            return DB::transaction(function () use ($product, $path) {
                $hasPrimary = $product->media()->where('is_primary', true)->exists();
                $media = $product->media()->create([
                    'file_url' => '/storage/'.$path,
                    'file_path' => $path,
                    'media_type' => 'image',
                    'alt_text' => $product->name,
                    'sort_order' => (int) $product->media()->max('sort_order') + 1,
                    'is_primary' => ! $hasPrimary,
                ]);
                $this->syncThumbnail($product);
                $this->audit->record('product.image_added', $product, ['media_id' => $media->id, 'path' => $path]);

                return $media;
            });
        } catch (\Throwable $e) {
            Storage::disk(ImageSanitizer::DISK)->delete($path);
            throw $e;
        }
    }

    public function remove(Product $product, ProductMedia $media): void
    {
        DB::transaction(function () use ($product, $media) {
            $wasPrimary = $media->is_primary;
            $media->delete();
            if ($wasPrimary) {
                $next = $product->media()->orderBy('sort_order')->orderBy('id')->first();
                $next?->update(['is_primary' => true]);
            }
            $this->syncThumbnail($product);
            $this->audit->record('product.image_removed', $product, ['media_id' => $media->id, 'url' => $media->file_url]);
        });
        // Chỉ xóa file do hệ thống lưu (ảnh URL cũ không có file_path) và không còn dòng nào dùng chung.
        if ($media->file_path && ! ProductMedia::where('file_path', $media->file_path)->exists()) {
            Storage::disk(ImageSanitizer::DISK)->delete($media->file_path);
        }
    }

    /** @param  array<int, int>  $ids  thứ tự mới (đủ mọi ảnh của sản phẩm) */
    public function reorder(Product $product, array $ids, ?int $primaryId): void
    {
        $current = $product->media()->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();
        $given = collect($ids)->map(fn ($id) => (int) $id);
        if ($given->sort()->values()->all() !== $current) {
            throw ValidationException::withMessages(['ids' => 'Danh sách ảnh không khớp với ảnh của sản phẩm.']);
        }
        if ($primaryId !== null && ! in_array($primaryId, $current, true)) {
            throw ValidationException::withMessages(['primary_id' => 'Ảnh chính không thuộc sản phẩm này.']);
        }
        DB::transaction(function () use ($product, $given, $primaryId) {
            $before = $product->media()->orderBy('sort_order')->orderBy('id')->pluck('id')->all();
            foreach ($given->values() as $i => $id) {
                ProductMedia::whereKey($id)->update(['sort_order' => $i]);
            }
            if ($primaryId !== null) {
                $product->media()->update(['is_primary' => false]);
                ProductMedia::whereKey($primaryId)->update(['is_primary' => true]);
            }
            $this->syncThumbnail($product);
            $this->audit->record('product.images_reordered', $product, ['order' => [$before, $given->all()], 'primary_id' => $primaryId]);
        });
    }

    private function syncThumbnail(Product $product): void
    {
        $primary = $product->media()->where('is_primary', true)->first();
        $product->forceFill(['thumbnail_url' => $primary?->file_url])->save();
    }
}
