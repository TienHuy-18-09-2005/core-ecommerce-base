<?php

namespace App\Repositories\Eloquent;

use App\DTOs\Catalog\GetProductsDTO;
use App\Models\Category;
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
            ->withMin(['variants as min_price' => fn ($q) => $q->where('is_active', true)], 'price')
            ->withMax(['variants as max_price' => fn ($q) => $q->where('is_active', true)], 'price')
            ->addSelect([
                'default_variant_id' => $this->defaultVariantColumn('id'),
                'default_variant_price' => $this->defaultVariantColumn('price'),
                'default_compare_at_price' => $this->defaultVariantColumn('compare_at_price'),
            ])
            ->published();

        // Lọc theo danh mục qua bảng pivot category_product
        if ($dto->categoryId) {
            // Bao gồm cả danh mục con (sidebar dạng cây theo parent_id)
            $categoryIds = $this->categoryWithDescendants($dto->categoryId);
            $query->whereHas('categories', function ($q) use ($categoryIds) {
                $q->whereIn('categories.id', $categoryIds);
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
            // Escape ký tự đại diện LIKE để "%" hay "_" không khớp mọi sản phẩm
            $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $dto->search);
            $term = '%'.$escaped.'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw("name LIKE ? ESCAPE '!'", [$term])
                    ->orWhereRaw("short_description LIKE ? ESCAPE '!'", [$term]);
            });
        }

        // Lọc theo khoảng giá thông qua biến thể SKU
        if ($dto->minPrice !== null || $dto->maxPrice !== null) {
            $query->whereHas('variants', function ($q) use ($dto) {
                $q->where('is_active', true);
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
        // Thứ tự ổn định để phân trang không lặp/sót sản phẩm
        $query->orderBy('id', 'desc');

        return $query->paginate($dto->perPage);
    }

    /** @return array<int, int> */
    private function categoryWithDescendants(int $categoryId): array
    {
        $ids = [$categoryId];
        $frontier = [$categoryId];
        for ($depth = 0; $depth < 10 && $frontier !== []; $depth++) {
            $frontier = Category::query()
                ->whereIn('parent_id', $frontier)
                ->where('is_active', true)
                ->pluck('id')
                ->diff($ids)
                ->all();
            $ids = array_merge($ids, $frontier);
        }

        return $ids;
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
