<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalLog extends Model
{
    protected $fillable = ['approver_employee_id', 'acted_on_behalf_of', 'action', 'role_at_approval', 'rejection_reason'];

    public function approvable()
    {
        return $this->morphTo();
    }

    public function approver()
    {
        return $this->belongsTo(Employee::class, 'approver_employee_id');
    }
}
