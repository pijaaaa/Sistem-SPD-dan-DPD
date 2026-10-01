<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Spd;
use Illuminate\Support\Facades\DB;

class SpdNumberGeneratorService
{
    public function generateNumber(Spd $spd): string
    {
        $year = now()->year;
        $monthRomawi = $this->romanMonth(now()->month);

        $deptId = $spd->main_department_id;
        $deptCode = $deptId ? Department::find($deptId)?->code : null;
        if (empty($deptCode)) {
            $deptCode = $spd->department?->code;
        }
        $deptCode = $deptCode ?? 'UNK';

        $last = DB::table('spds')
            ->whereYear('created_at', $year)
            ->where('main_department_id', $deptId)
            ->where('spd_number', 'like', "SPD/{$deptCode}/%/{$monthRomawi}/{$year}")
            ->lockForUpdate()
            ->latest('id')
            ->first();

        $nextNumber = $last ? (int) explode('/', $last->spd_number)[2] + 1 : 1;

        $spdNumber = sprintf('SPD/%s/%03d/%s/%d', $deptCode, $nextNumber, $monthRomawi, $year);

        // Safety: if the generated number somehow already exists, keep incrementing
        while (DB::table('spds')->where('spd_number', $spdNumber)->exists()) {
            $nextNumber++;
            $spdNumber = sprintf('SPD/%s/%03d/%s/%d', $deptCode, $nextNumber, $monthRomawi, $year);
        }

        $spd->spd_number = $spdNumber;

        return $spdNumber;
    }

    private function romanMonth(int $month): string
    {
        $romawi = [1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 6 => 'VI',
                   7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII'];
        return $romawi[$month] ?? '';
    }
}