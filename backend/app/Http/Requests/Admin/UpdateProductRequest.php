<?php

namespace App\Http\Requests\Admin;

use App\Support\ImageUrlRule;
use Illuminate\Foundation\Http\FormRequest;

/** Cập nhật toàn bộ sản phẩm (PUT): đồng bộ biến thể theo id, ảnh gallery thay toàn bộ. */
class UpdateProductRequest extends FormRequest
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
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'short_description' => ['nullable', 'string', 'max:1000'],
            'description' => ['nullable', 'string', 'max:100000'],
            'thumbnail_url' => ['nullable', 'string', 'max:500', ImageUrlRule::REGEX],
            'unit' => ['nullable', 'string', 'max:50'],
            'specifications' => ['nullable', 'array', 'max:50'],
            'specifications.*' => ['nullable', 'string', 'max:500'],
            'status' => ['required', 'in:draft,published,archived'],
            'is_featured' => ['sometimes', 'boolean'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'category_ids' => ['nullable', 'array', 'max:20'],
            'category_ids.*' => ['integer', 'distinct', 'exists:categories,id'],
            'media' => ['nullable', 'array', 'max:12'],
            'media.*.url' => ['required', 'string', 'max:500', ImageUrlRule::REGEX],
            'media.*.alt_text' => ['nullable', 'string', 'max:255'],
            'variants' => ['required', 'array', 'min:1', 'max:100'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.sku' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._-]+$/', 'distinct:ignore_case'],
            'variants.*.name' => ['required', 'string', 'max:255'],
            'variants.*.price' => ['required', 'numeric', 'min:0', 'max:999999999999'],
            'variants.*.compare_at_price' => ['nullable', 'numeric', 'min:0', 'max:999999999999'],
            'variants.*.cost_price' => ['nullable', 'numeric', 'min:0', 'max:999999999999'],
            'variants.*.stock_quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'variants.*.weight_grams' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'variants.*.image_url' => ['nullable', 'string', 'max:500', ImageUrlRule::REGEX],
            'variants.*.is_active' => ['sometimes', 'boolean'],
            'variants.*.is_default' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'variants.required' => 'Sản phẩm cần ít nhất một biến thể.',
            'variants.*.sku.distinct' => 'SKU bị trùng trong danh sách biến thể.',
            'variants.*.sku.regex' => 'SKU chỉ gồm chữ, số, dấu chấm, gạch ngang, gạch dưới.',
            'slug.regex' => 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.',
            'thumbnail_url.regex' => 'Đường dẫn ảnh không hợp lệ.',
            'media.*.url.regex' => 'Đường dẫn ảnh không hợp lệ.',
            'variants.*.image_url.regex' => 'Đường dẫn ảnh không hợp lệ.',
        ];
    }

    public function attributes(): array
    {
        return ['name' => 'tên sản phẩm', 'status' => 'trạng thái', 'variants.*.price' => 'giá', 'variants.*.sku' => 'SKU', 'variants.*.name' => 'tên biến thể', 'variants.*.stock_quantity' => 'tồn kho'];
    }
}
