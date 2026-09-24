<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Spd extends Model
{
    protected $fillable = ['spd_number', 'destination', 'start_date', 'end_date', 'purpose', 'status', 'is_cross_department'];

    public function employees()
    {
        return $this->hasMany(SpdEmployee::class);
    }

    public function approvalChains()
    {
        return $this->hasMany(SpdApprovalChain::class);
    }
}
