<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Services\SpdNumberGeneratorService;

class Spd extends Model
{
    protected $fillable = ['spd_number', 'destination', 'start_date', 'end_date', 'purpose', 'status', 'is_cross_department', 'main_department_id'];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($spd) {
            if (empty($spd->spd_number)) {
                $service = new SpdNumberGeneratorService();
                $service->generateNumber($spd);
            }
        });
    }

    public function employees()
    {
        return $this->hasMany(SpdEmployee::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class, 'main_department_id');
    }

    public function approvalChains()
    {
        return $this->hasMany(SpdApprovalChain::class);
    }
}