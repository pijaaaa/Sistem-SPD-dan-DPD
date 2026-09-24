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

        $lastNumber = DB::table('dpds')
            ->whereYear('created_at', $year)
            ->where('dpd_number', 'like', "DPD/{$deptCode}/%/{$year}")
            ->lockForUpdate()
            ->value('dpd_number');

        if ($lastNumber) {
            $parts = explode('/', $lastNumber);
            $nextNumber = (int) end($parts) + 1;
        } else {
            $nextNumber = 1;
        }

        $dpd->dpd_number = sprintf('DPD/%s/%03d/%d', $deptCode, $nextNumber, $year);

        return $dpd->dpd_number;
    }
}