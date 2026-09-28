<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Employee;

class StoreEmployeeRequest extends FormRequest
{
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
            'nip' => 'required|string|max:50|unique:employees,nip',
            'name' => 'required|string|max:255',
            'position' => 'nullable|string|max:255',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $roleId = $this->input('role_id');
            $deptId = $this->input('department_id');

            $roleName = \App\Models\Role::find($roleId)?->name;

            if ($roleName === 'general_manager') {
                $exists = Employee::where('role_id', $roleId)->exists();
                if ($exists) {
                    $validator->errors()->add('role_id', 'General Manager sudah ada di sistem. Hanya boleh ada 1 General Manager.');
                }
            }

            if (in_array($roleName, ['team_manager', 'manager'])) {
                $exists = Employee::where('role_id', $roleId)
                    ->where('department_id', $deptId)
                    ->exists();
                if ($exists) {
                    $validator->errors()->add('role_id', "{$roleName} sudah ada di departemen ini. Hanya boleh ada 1 untuk peran ini per departemen.");
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Email wajib diisi.',
            'email.unique' => 'Email sudah terdaftar.',
            'name.required' => 'Nama wajib diisi.',
            'role_id.required' => 'Role wajib dipilih.',
            'department_id.required' => 'Departemen wajib dipilih.',
            'nip.required' => 'NIP wajib diisi.',
            'nip.unique' => 'NIP sudah terdaftar.',
        ];
    }
}
