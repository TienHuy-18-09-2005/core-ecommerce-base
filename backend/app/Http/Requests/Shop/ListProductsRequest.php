<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates catalog query parameters (Pha 2, §2.2 / §2.5 / §2.8 of frontend_plan.md).
 * Only the filters supported by GetProductsDTO are accepted; anything else is ignored.
 */
class ListProductsRequest extends FormRequest
{
    public const SORTS = ['latest', 'price_asc', 'price_desc', 'popular'];

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('search'))) {
            $this->merge(['search' => trim($this->input('search'))]);
        }
    }

    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'integer', 'min:1'],
            'brand_id' => ['nullable', 'integer', 'min:1'],
            'search' => ['nullable', 'string', 'max:100'],
            'min_price' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'max_price' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'sort_by' => ['nullable', 'string', 'in:'.implode(',', self::SORTS)],
            'page' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'per_page' => ['nullable', 'integer', 'min:1'],
            'is_featured' => ['nullable', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $min = $this->input('min_price');
                $max = $this->input('max_price');
                if (is_numeric($min) && is_numeric($max) && (float) $max < (float) $min) {
                    $validator->errors()->add('max_price', 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.');
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'sort_by.in' => 'Kiểu sắp xếp không hợp lệ.',
            'search.max' => 'Từ khoá tìm kiếm tối đa 100 ký tự.',
        ];
    }
}
