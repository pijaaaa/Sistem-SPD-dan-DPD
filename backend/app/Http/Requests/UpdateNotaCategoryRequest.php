<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotaCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => 'required|string|max:50|unique:dpd_expense_categories,code,' . $this->route('nota_category')->id,
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ];
    }
}
