<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;

class SuggestProductsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('q'))) {
            $this->merge(['q' => trim($this->input('q'))]);
        }
    }

    public function rules(): array
    {
        return ['q' => ['required', 'string', 'min:2', 'max:100']];
    }

    public function messages(): array
    {
        return [
            'q.required' => 'Nhập từ khoá để tìm.',
            'q.min' => 'Nhập ít nhất 2 ký tự.',
            'q.max' => 'Từ khoá tìm kiếm tối đa 100 ký tự.',
        ];
    }
}
