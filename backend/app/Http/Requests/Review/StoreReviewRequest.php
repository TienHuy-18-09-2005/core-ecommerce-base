<?php

namespace App\Http\Requests\Review;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public const MAX_IMAGES = 3;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:2000'],
            'images' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            // mimes kiểm theo phần mở rộng, mimetypes kiểm nội dung (finfo) → không nhận SVG/HTML đổi đuôi
            'images.*' => [
                'bail',
                'file',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:2048',
                'dimensions:min_width=10,min_height=10,max_width=6000,max_height=6000',
            ],
        ];
    }

    public function attributes(): array
    {
        return [
            'rating' => 'số sao',
            'comment' => 'nội dung đánh giá',
            'images' => 'ảnh',
            'images.*' => 'ảnh',
        ];
    }
}
