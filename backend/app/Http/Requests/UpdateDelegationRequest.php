<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Employee;
use App\Models\Delegation;
use Illuminate\Validation\Validator;

class UpdateDelegationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'delegator_id' => 'sometimes|required|exists:employees,id',
            'delegate_id' => 'sometimes|required|exists:employees,id|different:delegator_id',
            'start_date' => 'sometimes|required|date|before_or_equal:end_date',
            'end_date' => 'sometimes|required|date|after_or_equal:start_date',
            'is_active' => 'sometimes|boolean',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $delegation = $this->route('delegation');
            
            $delegatorId = $this->input('delegator_id', $delegation->delegator_id);
            $delegateId = $this->input('delegate_id', $delegation->delegate_id);

            if ($delegatorId && $delegateId) {
                $delegator = Employee::with('role')->find($delegatorId);
                $delegate = Employee::with('role')->find($delegateId);

                if ($delegator && $delegate) {
                    // Delegate harus minimal team_manager (level >= 2)
                    if ($delegate->role->level < 2) {
                        $validator->errors()->add(
                            'delegate_id',
                            'Delegate harus minimal Team Manager atau role yang lebih tinggi.'
                        );
                    }
                }
            }
        });
    }
}