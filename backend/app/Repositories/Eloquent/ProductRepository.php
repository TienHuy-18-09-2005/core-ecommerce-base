<?php

namespace App\Repositories\Eloquent;

use App\DTOs\Catalog\GetProductsDTO;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Repositories\Contracts\ProductRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ProductRepository extends BaseRepository implements ProductRepositoryInterface
{
    public function __construct(Product $model)
    {
        parent::__construct($model);
    }

    public function getFilteredProducts(GetProductsDTO $dto): LengthAwarePaginator
    {
        // Chỉ SELECT các cột nhẹ ở trang danh sách, tuyệt đối không tải description hay specifications nặng
        $query = $this->model->query()
            ->select([
                'id',
                'brand_id',
                'name',
                'slug',
                'thumbnail_url',
                'unit',
                'has_variants',
                'is_featured',
                'created_at',
            ])
            ->with(['brand:id,name,slug'])
            ->withMin('variants as min_price', 'price')
            ->withMax('variants as max_price', 'price')
            ->addSelect([
                'default_variant_id' => $this->defaultVariantColumn('id'),
                'default_variant_price' => $this->defaultVariantColumn('price'),
                'default_compare_at_price' => $this->defaultVariantColumn('compare_at_price'),
            ])
            ->published();

        // Lọc theo danh mục qua bảng pivot category_product
        if ($dto->categoryId) {
            $query->whereHas('categories', function ($q) use ($dto) {
                $q->where('categories.id', $dto->categoryId);
            });
        }

        // Lọc theo thương hiệu
        if ($dto->brandId) {
            $query->where('brand_id', $dto->brandId);
        }

        if ($dto->featured !== null) {
            $query->where('is_featured', $dto->featured);
        }

        // Tìm kiếm Full-Text hoặc Like an toàn
        if ($dto->search) {
            $query->where(function ($q) use ($dto) {
                $q->where('name', 'like', "%{$dto->search}%")
                    ->orWhere('short_description', 'like', "%{$dto->search}%");
            });
        }

        // Lọc theo khoảng giá thông qua biến thể SKU
        if ($dto->minPrice !== null || $dto->maxPrice !== null) {
            $query->whereHas('variants', function ($q) use ($dto) {
                if ($dto->minPrice !== null) {
                    $q->where('price', '>=', $dto->minPrice);
                }
                if ($dto->maxPrice !== null) {
                    $q->where('price', '<=', $dto->maxPrice);
                }
            });
        }

        // Sắp xếp
        match ($dto->sortBy) {
            'price_asc' => $query->orderBy('min_price', 'asc'),
            'price_desc' => $query->orderBy('min_price', 'desc'),
            'popular' => $query->orderBy('view_count', 'desc'),
            default => $query->orderBy('created_at', 'desc'),
        };

        return $query->paginate($dto->perPage);
    }

    private function defaultVariantColumn(string $column): Builder
    {
        return ProductVariant::query()
            ->select($column)
            ->whereColumn('product_variants.product_id', 'products.id')
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->limit(1);
    }

    public function findBySlugWithDetails(string $slug): ?Product
    {
        return $this->model->query()
            ->where('slug', $slug)
            ->published()
            ->with([
                'brand',
                'categories',
                'media' => function ($q) {
                    $q->orderBy('sort_order', 'asc');
                },
                'variants' => function ($q) {
                    $q->where('is_active', true)->with('attributeValues.attribute');
                },
                'reviews' => function ($q) {
                    $q->approved()->latest()->limit(10);
                },
            ])
            ->first();
    }
}
