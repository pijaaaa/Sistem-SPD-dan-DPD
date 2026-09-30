<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreNotaCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => 'required|string|max:50|unique:dpd_expense_categories,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ];
    }
}
