<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpdApprovalChain extends Model
{
    protected $fillable = ['spd_id', 'spd_employee_id', 'approver_employee_id', 'level_order', 'status'];

    public function spd()
    {
        return $this->belongsTo(Spd::class);
    }

    public function spdEmployee()
    {
        return $this->belongsTo(SpdEmployee::class);
    }

    public function approver()
    {
        return $this->belongsTo(Employee::class, 'approver_employee_id');
    }

    public function logs()
    {
        return $this->morphMany(ApprovalLog::class, 'approvable');
    }
}
