<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Delegation extends Model
{
    protected $fillable = ['delegator_id', 'delegate_id', 'start_date', 'end_date', 'created_by', 'is_active'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function delegator()
    {
        return $this->belongsTo(Employee::class, 'delegator_id');
    }

    public function delegate()
    {
        return $this->belongsTo(Employee::class, 'delegate_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if ($model->delegator_id === $model->delegate_id) {
                throw new \Exception('Delegate tidak boleh sama dengan delegator');
            }

            if ($model->is_active) {
                $overlap = self::where('delegator_id', $model->delegator_id)
                    ->where('is_active', true)
                    ->where(function ($q) use ($model) {
                        $q->whereBetween('start_date', [$model->start_date, $model->end_date])
                            ->orWhereBetween('end_date', [$model->start_date, $model->end_date])
                            ->orWhere(function ($sq) use ($model) {
                                $sq->where('start_date', '<=', $model->start_date)
                                    ->where('end_date', '>=', $model->end_date);
                            });
                    })
                    ->exists();

                if ($overlap) {
                    throw new \Exception('Sudah ada delegasi aktif yang overlapping untuk delegator ini pada periode tersebut');
                }
            }
        });

        static::updating(function ($model) {
            if ($model->delegator_id === $model->delegate_id) {
                throw new \Exception('Delegate tidak boleh sama dengan delegator');
            }

            if ($model->is_active) {
                $overlap = self::where('delegator_id', $model->delegator_id)
                    ->where('id', '!=', $model->id)
                    ->where('is_active', true)
                    ->where(function ($q) use ($model) {
                        $q->whereBetween('start_date', [$model->start_date, $model->end_date])
                            ->orWhereBetween('end_date', [$model->start_date, $model->end_date])
                            ->orWhere(function ($sq) use ($model) {
                                $sq->where('start_date', '<=', $model->start_date)
                                    ->where('end_date', '>=', $model->end_date);
                            });
                    })
                    ->exists();

                if ($overlap) {
                    throw new \Exception('Sudah ada delegasi aktif yang overlapping untuk delegator ini pada periode tersebut');
                }
            }
        });
    }

    public function isActive()
    {
        return $this->is_active && now()->between($this->start_date, $this->end_date);
    }
}
