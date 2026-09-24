<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|unique:users,email',
            'password' => 'nullable|string|min:6',
            'role_id' => 'required|exists:roles,id',
            'department_id' => 'required|exists:departments,id',
            'supervisor_id' => 'nullable|exists:employees,id',
            'nip' => 'required|string|max:50|unique:employees,nip',
            'name' => 'required|string|max:255',
            'position' => 'nullable|string|max:255',
        ];
    }
}
