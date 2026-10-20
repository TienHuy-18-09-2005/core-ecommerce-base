<?php

namespace App\Services\Admin;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminProductService
{
    public function createProductWithVariants(array $data)
    {
        return DB::transaction(function () use ($data) {
            // 1. Tạo sản phẩm SPU
            $product = Product::create([
                'brand_id' => $data['brand_id'] ?? null,
                'name' => $data['name'],
                'slug' => Str::slug($data['name']) . '-' . Str::random(5),
                'short_description' => $data['short_description'] ?? null,
                'description' => $data['description'] ?? null,
                'thumbnail_url' => $data['thumbnail_url'] ?? null,
                'unit' => $data['unit'] ?? 'cái',
                'specifications' => $data['specifications'] ?? null, // JSON thông số động
                'has_variants' => !empty($data['variants']),
                'status' => $data['status'] ?? 'draft',
                'is_featured' => $data['is_featured'] ?? false,
            ]);

            // Gắn danh mục qua bảng pivot
            if (!empty($data['category_ids'])) {
                $product->categories()->attach($data['category_ids']);
            }

            // 2. Tạo biến thể SKU
            if (!empty($data['variants'])) {
                foreach ($data['variants'] as $index => $variantData) {
                    $variant = ProductVariant::create([
                        'product_id' => $product->id,
                        'sku' => $variantData['sku'] ?? 'SKU-' . strtoupper(Str::random(6)),
                        'name' => $variantData['name'] ?? 'Mặc định',
                        'price' => $variantData['price'],
                        'compare_at_price' => $variantData['compare_at_price'] ?? null,
                        'cost_price' => $variantData['cost_price'] ?? null,
                        'stock_quantity' => $variantData['stock_quantity'] ?? 0,
                        'weight_grams' => $variantData['weight_grams'] ?? 0,
                        'image_url' => $variantData['image_url'] ?? $product->thumbnail_url,
                        'is_default' => $index === 0,
                        'is_active' => true,
                    ]);

                    // Gắn thuộc tính EAV cho biến thể nếu có
                    if (!empty($variantData['attribute_value_ids'])) {
                        $variant->attributeValues()->attach($variantData['attribute_value_ids']);
                    }
                }
            } else {
                // Nếu không có biến thể, bắt buộc tạo 1 dòng mặc định theo quy định kỹ thuật
                ProductVariant::create([
                    'product_id' => $product->id,
                    'sku' => 'SKU-' . strtoupper(Str::random(6)),
                    'name' => 'Mặc định',
                    'price' => $data['price'] ?? 0,
                    'stock_quantity' => $data['stock_quantity'] ?? 0,
                    'is_default' => true,
                    'is_active' => true,
                ]);
            }

            return $product->load(['variants.attributeValues', 'categories', 'brand']);
        });
    }
}
