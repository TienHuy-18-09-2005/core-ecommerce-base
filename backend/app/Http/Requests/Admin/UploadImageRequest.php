<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UploadImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image' => ['bail', 'required', 'file', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp',
                'max:5120', 'dimensions:max_width=6000,max_height=6000'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Vui lòng chọn ảnh.',
            'image.mimes' => 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.',
            'image.mimetypes' => 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.',
            'image.max' => 'Ảnh tối đa 5MB.',
            'image.dimensions' => 'Ảnh tối đa 6000×6000 px.',
        ];
    }
}
