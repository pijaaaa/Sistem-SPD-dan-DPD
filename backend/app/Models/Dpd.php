<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Services\DpdNumberGeneratorService;

class Dpd extends Model
{
    protected $fillable = [
        'spd_id',
        'dpd_number',
        'employee_id',
        'submission_date',
        'total_nominal',
        'status',
        'spm_date',
    ];

    protected $casts = [
        'submission_date' => 'date',
        'spm_date' => 'date',
        'total_nominal' => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($dpd) {
            if (empty($dpd->dpd_number)) {
                $service = new DpdNumberGeneratorService();
                $service->generateNumber($dpd);
            }
        });
    }

    public function spd()
    {
        return $this->belongsTo(Spd::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function reports()
    {
        return $this->hasMany(DpdReport::class, 'dpd_id');
    }

    public function expenses()
    {
        return $this->hasMany(DpdExpense::class, 'dpd_id');
    }

    public function approvalChains()
    {
        return $this->hasMany(DpdApprovalChain::class);
    }

    public function recalculateTotal()
    {
        $total = $this->expenses()->sum('amount');
        $this->update(['total_nominal' => $total]);
        return $total;
    }
}
