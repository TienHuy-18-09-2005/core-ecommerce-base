<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReorderProductImagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ids' => ['present', 'array', 'max:50'],
            'ids.*' => ['integer', 'distinct'],
            'primary_id' => ['nullable', 'integer'],
        ];
    }
}
