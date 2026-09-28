<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use App\Models\DpdExpenseCategory;
use App\Models\Employee;
use App\Models\Role;
use App\Models\Delegation;
use App\Models\Spd;
use App\Models\SpdEmployee;
use App\Models\SpdApprovalChain;
use App\Models\User;
use App\Services\SpdApprovalService;
use Illuminate\Database\Seeder;

class TestDataSeeder extends Seeder
{
    protected $spdNumber;

    public function run(): void
    {
        $this->spdNumber = new \App\Services\SpdNumberGeneratorService();
        $spdApproval = new SpdApprovalService();

        $roles = Role::all()->keyBy('name');

        AppSetting::firstOrCreate(['key' => 'dpd_submission_deadline_days'], ['value' => '7', 'description' => 'Batas waktu pengajuan DPD (hari setelah SPD selesai)']);
        AppSetting::firstOrCreate(['key' => 'max_nominal_per_day'], ['value' => '1500000', 'description' => 'Maksimal nominal rata-rata per hari dinas (IDR)']);

        $categories = [
            ['name' => 'Transport', 'code' => 'transport'],
            ['name' => 'Akomodasi', 'code' => 'accommodation'],
            ['name' => 'Konsumsi', 'code' => 'consumption'],
            ['name' => 'Lainnya', 'code' => 'other'],
        ];
        foreach ($categories as $cat) {
            DpdExpenseCategory::firstOrCreate(['code' => $cat['code']], ['name' => $cat['name']]);
        }

        $userEmployee = Employee::where('role_id', $roles['user']->id)->first();
        $tmEmployee = Employee::where('role_id', $roles['team_manager']->id)->first();
        $mgrEmployee = Employee::where('role_id', $roles['manager']->id)->first();
        $gmEmployee = Employee::where('role_id', $roles['general_manager']->id)->first();

        // SPD 1: User creates SPD for same department (1 employee)
        $spd1 = Spd::firstOrCreate(['spd_number' => 'SPD/TEST/001/IX/2026'], [
            'destination' => 'Jakarta',
            'purpose' => 'Kunjungan kerja ke kantor pusat',
            'start_date' => '2026-09-28',
            'end_date' => '2026-09-30',
            'status' => 'pending',
            'is_cross_department' => false,
            'main_department_id' => $userEmployee->department_id,
        ]);
        SpdEmployee::firstOrCreate(['spd_id' => $spd1->id, 'employee_id' => $userEmployee->id], ['is_primary' => true]);
        if (!SpdApprovalChain::where('spd_id', $spd1->id)->exists()) {
            $spdApproval->generateApprovalChain($spd1);
        }

        // SPD 2: Cross-department (user + manager from different dept)
        $otherDeptUser = Employee::where('role_id', $roles['user']->id)
            ->where('department_id', '!=', $userEmployee->department_id)
            ->first();

        if ($otherDeptUser) {
            $spd2 = Spd::firstOrCreate(['spd_number' => 'SPD/TEST/002/IX/2026'], [
                'destination' => 'Bandung',
                'purpose' => 'Rapat koordinasi lintas departemen',
                'start_date' => '2026-10-05',
                'end_date' => '2026-10-07',
                'status' => 'pending',
                'is_cross_department' => true,
                'main_department_id' => $userEmployee->department_id,
            ]);
            SpdEmployee::firstOrCreate(['spd_id' => $spd2->id, 'employee_id' => $userEmployee->id], ['is_primary' => true]);
            SpdEmployee::firstOrCreate(['spd_id' => $spd2->id, 'employee_id' => $otherDeptUser->id], ['is_primary' => false]);
            if (!SpdApprovalChain::where('spd_id', $spd2->id)->exists()) {
                $spdApproval->generateApprovalChain($spd2);
            }
        }

        // Delegation: GM delegates to Manager
        if ($gmEmployee && $mgrEmployee) {
            Delegation::firstOrCreate(
                ['delegator_id' => $gmEmployee->id, 'delegate_id' => $mgrEmployee->id],
                [
                    'is_active' => true,
                    'start_date' => '2026-01-01',
                    'end_date' => '2026-12-31',
                    'created_by' => $gmEmployee->id,
                ]
            );
        }

        $this->command->info('Test data seeder selesai.');
    }
}
