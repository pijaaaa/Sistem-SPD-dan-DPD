<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DpdApprovalChain extends Model
{
    protected $fillable = ['dpd_id', 'approver_employee_id', 'level_order', 'status'];

    public function dpd()
    {
        return $this->belongsTo(Dpd::class);
    }

    public function approver()
    {
        return $this->belongsTo(Employee::class, 'approver_employee_id');
    }

    public function spdEmployee()
    {
        return $this->belongsTo(SpdEmployee::class);
    }

    public function logs()
    {
        return $this->morphMany(ApprovalLog::class, 'approvable');
    }
}
