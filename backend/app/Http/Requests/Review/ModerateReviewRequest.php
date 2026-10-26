<?php

namespace App\Http\Requests\Review;

use Illuminate\Foundation\Http\FormRequest;

class ModerateReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['is_approved' => ['required', 'boolean']];
    }

    public function attributes(): array
    {
        return ['is_approved' => 'trạng thái duyệt'];
    }
}
