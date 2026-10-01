<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $fillable = ['user_id', 'role_id', 'department_id', 'nip', 'no_pekerja', 'employee_number', 'name', 'position'];

    protected $appends = ['is_on_trip'];

    public function getEmployeeNumberAttribute(): ?string
    {
        return $this->no_pekerja ?? $this->attributes['employee_number'] ?? null;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function spds()
    {
        return $this->belongsToMany(Spd::class, 'spd_employees');
    }

    public function getIsOnTripAttribute(): bool
    {
        $today = now()->toDateString();

        // whereDate() strips the time part so this stays correct on both
        // MySQL (DATE columns) and SQLite (stores 'Y-m-d H:i:s').
        return SpdEmployee::where('employee_id', $this->id)
            ->whereHas('spd', function ($query) use ($today) {
                $query->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today)
                    ->whereNotIn('status', ['rejected']);
            })
            ->exists();
    }
}
