<?php

namespace App\Services;

use App\Models\Dpd;
use App\Models\Spd;
use Illuminate\Support\Facades\DB;

class DpdNumberGeneratorService
{
    public function generateNumber(Dpd $dpd): string
    {
        $year = now()->year;
        $deptCode = 'UNK';

        if ($dpd->spd) {
            $dpd->spd->load('department');
            $deptCode = $dpd->spd->department?->code ?? 'UNK';
        }

        $last = DB::table('dpds')
            ->whereYear('created_at', $year)
            ->where('dpd_number', 'like', "DPD/{$deptCode}/%/{$year}")
            ->orderByRaw("CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(dpd_number, '/', 3), '/', -1) AS UNSIGNED) DESC")
            ->lockForUpdate()
            ->first();

        $nextNumber = $last ? (int) explode('/', $last->dpd_number)[2] + 1 : 1;

        $dpdNumber = sprintf('DPD/%s/%03d/%d', $deptCode, $nextNumber, $year);

        // Safety: if the generated number somehow already exists, keep incrementing
        while (DB::table('dpds')->where('dpd_number', $dpdNumber)->exists()) {
            $nextNumber++;
            $dpdNumber = sprintf('DPD/%s/%03d/%d', $deptCode, $nextNumber, $year);
        }

        $dpd->dpd_number = $dpdNumber;

        return $dpdNumber;
    }
}