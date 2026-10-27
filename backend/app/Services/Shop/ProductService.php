<?php

namespace App\Services\Shop;

use App\DTOs\Catalog\GetProductsDTO;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Repositories\Contracts\ProductRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class ProductService
{
    protected ProductRepositoryInterface $productRepository;

    public function __construct(ProductRepositoryInterface $productRepository)
    {
        $this->productRepository = $productRepository;
    }

    public function getCatalogProducts(GetProductsDTO $dto): LengthAwarePaginator
    {
        return $this->productRepository->getFilteredProducts($dto);
    }

    public function suggest(string $term): Collection
    {
        return $this->productRepository->suggest($term, 8);
    }

    public function getProductDetail(string $slug): ?Product
    {
        $product = $this->productRepository->findBySlugWithDetails($slug);

        if ($product) {
            // Tăng view count ngầm (có thể đưa vào job/queue nếu cao tải)
            $product->increment('view_count');
            // Lọc lại khi hiển thị: mô tả cũ (nhập trước khi có bộ lọc) cũng an toàn để render HTML.
            $product->description = app(\App\Services\Support\HtmlSanitizer::class)->clean($product->description);
        }

        return $product;
    }

    public function getActiveCategories(): array
    {
        // Redis cache in this app unserializes with allowed_classes=false, so
        // Eloquent models come back as incomplete classes. Store a plain tree.
        return Cache::remember('shop_active_category_tree_v2', 86400, function (): array {
            $categories = Category::query()
                ->active()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();

            $grouped = $categories->groupBy(fn (Category $category) => $category->parent_id ?? 0);

            $build = function (int $parentId) use (&$build, $grouped): Collection {
                return $grouped->get($parentId, collect())
                    ->values()
                    ->map(function (Category $category) use ($build) {
                        $category->setRelation('children', $build($category->id));

                        return $category;
                    });
            };

            return $build(0)->toArray();
        });
    }

    public function getActiveBrands(): array
    {
        return Cache::remember('shop_active_brands_v2', 86400, function (): array {
            return Brand::query()
                ->active()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->toArray();
        });
    }
}
