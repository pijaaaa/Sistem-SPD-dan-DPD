<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Spd;

class CreateDpdRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'spd_id' => 'required|exists:spds,id|where:status,approved',
            'employee_id' => 'required|exists:employees,id',
            'submission_date' => 'required|date|after_or_equal:today',
        ];
    }

    public function withTransformedData()
    {
        return [
            'spd' => Spd::with(['employee' => function ($q) {
                $q->with('user', 'role', 'department');
            }])->findOrFail($this->spd_id),
        ];
    }

    public function messages(): array
    {
        return [
            'spd_id.required' => 'SPD wajib dipilih.',
            'spd_id.exists' => 'SPD tidak ditemukan.',
            'spd_id.approved' => 'DPD hanya bisa dibuat jika SPD terkait sudah berstatus "approved".',
            'employee_id.required' => 'Employee wajib dipilih.',
            'employee_id.exists' => 'Employee tidak ditemukan.',
            'submission_date.required' => 'Tanggal pengajuan DPD wajib diisi.',
            'submission_date.after_or_equal' => 'Tanggal pengajuan harus setelah hari ini.',
        ];
    }
}