<?php

namespace App\Http\Requests\Admin;

use App\Support\ImageUrlRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'name' => ['required', 'string', 'max:255'],
            'short_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'thumbnail_url' => ['nullable', 'string', 'max:500', ImageUrlRule::REGEX],
            'unit' => ['nullable', 'string', 'max:50'],
            'specifications' => ['nullable', 'array', 'max:50'],
            'specifications.*' => ['nullable', 'string', 'max:500'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'media' => ['nullable', 'array', 'max:12'],
            'media.*.url' => ['required', 'string', 'max:500', ImageUrlRule::REGEX],
            'media.*.alt_text' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:draft,published,archived'],
            'is_featured' => ['nullable', 'boolean'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'variants' => ['nullable', 'array'],
            'variants.*.sku' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9._-]+$/', 'distinct:ignore_case'],
            'variants.*.name' => ['nullable', 'string', 'max:255'],
            'variants.*.price' => ['required_with:variants', 'numeric', 'min:0'],
            'variants.*.compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.stock_quantity' => ['nullable', 'integer', 'min:0'],
            'variants.*.weight_grams' => ['nullable', 'integer', 'min:0'],
            'variants.*.image_url' => ['nullable', 'string', 'max:500', ImageUrlRule::REGEX],
            'variants.*.attribute_value_ids' => ['nullable', 'array'],
            'variants.*.attribute_value_ids.*' => ['integer', 'exists:attribute_values,id'],
        ];
    }

    public function attributes(): array
    {
        return ['name' => 'tên sản phẩm', 'variants.*.price' => 'giá', 'variants.*.sku' => 'SKU', 'variants.*.name' => 'tên biến thể', 'variants.*.stock_quantity' => 'tồn kho'];
    }
}
