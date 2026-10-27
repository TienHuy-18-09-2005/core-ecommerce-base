<?php

namespace App\Http\Requests\Review;

class UpdateReviewRequest extends StoreReviewRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            // Đường dẫn ảnh cũ muốn giữ lại; ảnh không có trong danh sách sẽ bị xóa
            'keep_images' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'keep_images.*' => ['string', 'max:255'],
        ];
    }
}
