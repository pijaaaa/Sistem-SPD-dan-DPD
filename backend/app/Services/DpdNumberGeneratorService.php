<?php

namespace App\Services;

use App\Models\Dpd;
use App\Models\Spd;

class DpdNumberGeneratorService
{
    public function generateNumber(Dpd $dpd): string
    {
        // Pola serupa SPD: DPD-{TAHUN}-{NO_URUT}
        // Reset per tahun, kode departemen diambil dari SPD terkait

        $today = now();
        $year = $today->year;

        // Ambil nomor terakhir dari DPD tahun ini
        $lastDpd = Dpd::whereYear('created_at', $year)
            ->orderBy('created_at', 'desc')
            ->first();

        $lastNumber = $lastDpd ? (int) substr($lastDpd->dpd_number, 4) : 0;
        $nextNumber = $lastNumber + 1;

        // Format: DPD-{tahun}-{no_urut}, misal: DPD-2026-001
        $dpd->dpd_number = 'DPD-' . $year . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        return $dpd->dpd_number;
    }

    public function getSubmissionDeadlineDays(): ?int
    {
        $days = AppSetting::get('dpd_submission_deadline_days');
        return $days ? (int) $days : null;
    }
}