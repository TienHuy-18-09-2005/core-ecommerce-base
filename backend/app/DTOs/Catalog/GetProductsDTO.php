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
        public int $perPage = 12
    ) {}

    public static function fromRequest($request): self
    {
        return new self(
            categoryId: $request->input('category_id'),
            brandId: $request->input('brand_id'),
            search: $request->input('search'),
            minPrice: $request->input('min_price'),
            maxPrice: $request->input('max_price'),
            sortBy: $request->input('sort_by', 'latest'),
            perPage: (int) $request->input('per_page', 12)
        );
    }
}
