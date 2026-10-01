<?php

namespace App\Observers;

use App\Models\Employee;
use Illuminate\Support\Facades\DB;

class EmployeeObserver
{
    public function creating(Employee $employee): void
    {
        if (empty($employee->no_pekerja) && empty($employee->employee_number)) {
            $number = $this->generateEmployeeNumber();
            $employee->no_pekerja = $number;
            $employee->employee_number = $number;
        }
    }

    private function generateEmployeeNumber(): string
    {
        return DB::transaction(function () {
            $max = Employee::max('id');
            $nextId = $max ? $max + 1 : 1;

            $prefix = 'EMP-';
            $number = $prefix.str_pad($nextId, 5, '0', STR_PAD_LEFT);

            while (Employee::where('employee_number', $number)->exists()) {
                $nextId++;
                $number = $prefix.str_pad($nextId, 5, '0', STR_PAD_LEFT);
            }

            return $number;
        });
    }
}
