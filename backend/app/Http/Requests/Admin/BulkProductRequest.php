<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/** Thao tác hàng loạt trên sản phẩm: đổi trạng thái (ẩn/hiện) hoặc gán thêm danh mục. */
class BulkProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'distinct'],
            'action' => ['required', 'in:status,add_category'],
            'status' => ['required_if:action,status', 'nullable', 'in:draft,published,archived'],
            'category_id' => ['required_if:action,add_category', 'nullable', 'integer', 'exists:categories,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'ids.required' => 'Chưa chọn sản phẩm nào.',
            'ids.max' => 'Mỗi lần tối đa 100 sản phẩm.',
            'status.required_if' => 'Chọn trạng thái mới.',
            'category_id.required_if' => 'Chọn danh mục cần gán.',
        ];
    }
}
