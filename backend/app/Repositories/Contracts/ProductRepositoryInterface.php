<?php

namespace App\Repositories\Contracts;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use App\DTOs\Catalog\GetProductsDTO;
use App\Models\Product;

interface ProductRepositoryInterface extends BaseRepositoryInterface
{
    public function getFilteredProducts(GetProductsDTO $dto): LengthAwarePaginator;
    public function findBySlugWithDetails(string $slug): ?Product;
}
