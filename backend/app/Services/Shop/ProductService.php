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

    public function getProductDetail(string $slug): ?Product
    {
        $product = $this->productRepository->findBySlugWithDetails($slug);

        if ($product) {
            // Tăng view count ngầm (có thể đưa vào job/queue nếu cao tải)
            $product->increment('view_count');
        }

        return $product;
    }

    public function getActiveCategories(): Collection
    {
        return Cache::remember('shop_active_category_tree', 86400, function () {
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

            return $build(0);
        });
    }

    public function getActiveBrands(): Collection
    {
        return Cache::remember('shop_active_brands', 86400, function () {
            return Brand::query()
                ->active()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();
        });
    }
}
