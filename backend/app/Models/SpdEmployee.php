<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpdEmployee extends Model
{
    protected $fillable = ['spd_id', 'employee_id', 'is_primary', 'status'];

    public function spd()
    {
        return $this->belongsTo(Spd::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approvalChains()
    {
        return $this->hasMany(SpdApprovalChain::class);
    }
}
