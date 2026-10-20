<?php

namespace App\DTOs\Catalog;

readonly class GetProductsDTO
{
    public function __construct(
        public ?int $categoryId = null,
        public ?int $brandId = null,
        public ?string $search = null,
        public ?float $minPrice = null,
        public ?float $maxPrice = null,
        public ?string $sortBy = 'latest',
        public int $perPage = 12,
        public ?bool $featured = null,
    ) {}

    public static function fromRequest($request): self
    {
        $featured = null;
        if ($request->filled('is_featured')) {
            $featured = $request->boolean('is_featured');
        }

        $int = fn (string $key): ?int => $request->filled($key) ? (int) $request->input($key) : null;
        $float = fn (string $key): ?float => $request->filled($key) ? (float) $request->input($key) : null;
        $search = $request->filled('search') ? (string) $request->input('search') : null;

        return new self(
            categoryId: $int('category_id'),
            brandId: $int('brand_id'),
            search: $search,
            minPrice: $float('min_price'),
            maxPrice: $float('max_price'),
            sortBy: $request->input('sort_by') ?: 'latest',
            perPage: max(1, min(48, (int) $request->input('per_page', 12))),
            featured: $featured,
        );
    }
}
