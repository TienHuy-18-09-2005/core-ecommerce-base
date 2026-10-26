<?php

namespace App\Http\Requests\Admin;

use App\Support\ImageUrlRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('category')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('categories', 'slug')->ignore($id)],
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image_url' => ['nullable', 'string', 'max:500', ImageUrlRule::REGEX],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
        ];
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.',
            'slug.unique' => 'Slug đã được sử dụng.',
            'image_url.regex' => 'Đường dẫn ảnh không hợp lệ.',
        ];
    }

    public function attributes(): array
    {
        return ['name' => 'tên danh mục', 'parent_id' => 'danh mục cha'];
    }
}
