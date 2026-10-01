<?php

namespace App\Http\Requests;

use App\Models\Employee;
use App\Models\SpdEmployee;
use Illuminate\Foundation\Http\FormRequest;

class StoreSpdRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'destination' => 'required|string|max:255',
            'purpose' => 'required|string|max:1000',
            'start_date' => 'required|date|before_or_equal:end_date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'employees' => 'required|array|min:1',
            'employees.*.employee_id' => 'required|exists:employees,id',
            'employees.*.is_primary' => 'sometimes|boolean',
            'main_department_id' => 'nullable|exists:departments,id',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $employees = $this->input('employees', []);

            $employeeIds = array_column($employees, 'employee_id');
            if (count($employeeIds) !== count(array_unique($employeeIds))) {
                $validator->errors()->add('employees', 'Tidak boleh ada employee duplikat dalam satu SPD.');
            }

            $hasPrimary = false;
            foreach ($employees as $e) {
                if (! empty($e['is_primary'])) {
                    $hasPrimary = true;
                    break;
                }
            }
            if (! $hasPrimary) {
                $validator->errors()->add('employees', 'Minimal harus ada satu employee sebagai pemohon utama (is_primary).');
            }

            $today = now()->toDateString();
            $onTripEmployees = SpdEmployee::whereIn('employee_id', $employeeIds)
                ->whereHas('spd', function ($query) use ($today) {
                    $query->whereDate('start_date', '<=', $today)
                        ->whereDate('end_date', '>=', $today)
                        ->whereNotIn('status', ['rejected']);
                })
                ->pluck('employee_id')
                ->toArray();

            if (! empty($onTripEmployees)) {
                $names = Employee::whereIn('id', $onTripEmployees)
                    ->pluck('name', 'id')
                    ->toArray();
                $nameList = implode(', ', $names);
                $validator->errors()->add(
                    'employees',
                    "Karyawan berikut sedang dalam perjalanan dinas: {$nameList}. Tidak dapat dipilih untuk SPD baru."
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'destination.required' => 'Tujuan wajib diisi.',
            'purpose.required' => 'Keperluan wajib diisi.',
            'start_date.required' => 'Tanggal mulai wajib diisi.',
            'end_date.required' => 'Tanggal selesai wajib diisi.',
            'start_date.before_or_equal' => 'Tanggal mulai harus sebelum atau sama dengan tanggal selesai.',
            'employees.required' => 'Minimal harus ada satu karyawan.',
            'employees.min' => 'Minimal harus ada satu karyawan.',
            'main_department_id.required' => 'Departemen pemohon utama wajib dipilih.',
        ];
    }
}
