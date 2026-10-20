<?php

namespace App\Services\Shop;

use App\Repositories\Contracts\ProductRepositoryInterface;
use App\DTOs\Catalog\GetProductsDTO;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use App\Models\Product;
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

    public function getActiveCategories()
    {
        return Cache::remember('shop_active_categories', 86400, function () {
            return \App\Models\Category::active()->with('children')->whereNull('parent_id')->get();
        });
    }
}
