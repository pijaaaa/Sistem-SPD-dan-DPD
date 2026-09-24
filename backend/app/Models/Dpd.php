<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use App\Models\AppSetting;
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

    public function category()
    {
        return $this->belongsTo(DpdExpenseCategory::class);
    }

    public function getTotalNominalAttribute($value)
    {
        return $value ?? 0;
    }

    public function setTotalNominalAttribute($value)
    {
        $this->attributes['total_nominal'] = is_numeric($value) ? (float) $value : 0;
    }

    public function calculateTotalNominal(): float
    {
        $total = $this->expenses()->sum(fn($q) => $q->amount);
        $this->update(['total_nominal' => $total]);
        return $total;
    }

    public function generateNumber()
    {
        $service = new DpdNumberGeneratorService();
        $service->generateNumber($this);
    }

    public static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->generateNumber();
        });
    }
}