<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use App\Models\Delegation;
use App\Models\Department;
use App\Models\Dpd;
use App\Models\DpdExpense;
use App\Models\DpdExpenseCategory;
use App\Models\DpdReport;
use App\Models\Employee;
use App\Models\Role;
use App\Models\Spd;
use App\Models\SpdEmployee;
use App\Models\User;
use App\Services\DpdNumberGeneratorService;
use App\Services\SpdApprovalService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestDataSeeder extends Seeder
{
    protected $spdNumber;
    protected $dpdNumber;

    public function run(): void
    {
        $this->spdNumber = new \App\Services\SpdNumberGeneratorService();
        $this->dpdNumber = new DpdNumberGeneratorService();
        $spdApproval = new SpdApprovalService();

        $roles = Role::all()->keyBy('name');

        // ============ DEPARTMENTS ============
        $deptNames = [
            'IT' => 'Information Technology',
            'FIN' => 'Finance',
            'HR' => 'Human Resources',
            'OP' => 'Operations',
        ];
        $depts = [];
        foreach ($deptNames as $code => $name) {
            $depts[$code] = Department::firstOrCreate(['code' => $code], ['name' => $name]);
        }

        // ============ APP SETTINGS ============
        AppSetting::updateOrCreate(['key' => 'dpd_submission_deadline_days'], ['value' => '7', 'description' => 'Batas waktu pengajuan DPD (hari setelah SPD selesai)']);
        AppSetting::updateOrCreate(['key' => 'max_nominal_per_day'], ['value' => '1500000', 'description' => 'Maksimal nominal rata-rata per hari dinas (IDR)']);

        // ============ EXPENSE CATEGORIES ============
        $categories = [
            ['name' => 'Transport', 'code' => 'transport'],
            ['name' => 'Akomodasi', 'code' => 'accommodation'],
            ['name' => 'Konsumsi', 'code' => 'consumption'],
            ['name' => 'Lainnya', 'code' => 'other'],
        ];
        foreach ($categories as $cat) {
            DpdExpenseCategory::firstOrCreate(['code' => $cat['code']], ['name' => $cat['name']]);
        }

        // ============ EMPLOYEES ============
        $makeEmp = function ($name, $email, $nip, $role, $deptCode, $position, $supNip = null) use ($roles, $depts, &$empsByNip) {
            $user = User::firstOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => Hash::make('password')]
            );
            $sup = $supNip ? $empsByNip[$supNip] ?? null : null;
            $emp = Employee::updateOrCreate(
                ['nip' => $nip],
                [
                    'user_id' => $user->id,
                    'role_id' => $roles[$role]->id,
                    'department_id' => $depts[$deptCode]->id,
                    'supervisor_id' => $sup?->id,
                    'name' => $name,
                    'position' => $position,
                ]
            );
            $empsByNip[$nip] = $emp;
            return $emp;
        };

        $empsByNip = [];

        // GM (level 5)
        $gm = $makeEmp('Budi santoso', 'gm@company.com', 'GM-001', 'general_manager', 'IT', 'General Manager');

        // Manager (level 4)
        $itMgr1 = $makeEmp('Sari Dewi', 'sari.manager@company.com', 'MGR-IT-01', 'manager', 'IT', 'IT Manager', 'GM-001');
        $itMgr2 = $makeEmp('Andi Wijaya', 'andi.manager@company.com', 'MGR-IT-02', 'manager', 'IT', 'IT Manager', 'GM-001');
        $finMgr = $makeEmp('Lena Kusuma', 'lena.manager@company.com', 'MGR-FIN-01', 'manager', 'FIN', 'Finance Manager', 'GM-001');
        $hrMgr = $makeEmp('Budi Hartono', 'budi.manager@company.com', 'MGR-HR-01', 'manager', 'HR', 'HR Manager', 'GM-001');

        // Admin departemen (level 3) - report ke manager
        $makeEmp('Raka Putra', 'raka.admin@company.com', 'ADM-IT-01', 'admin_departemen', 'IT', 'Admin Departemen IT', 'MGR-IT-01');
        $makeEmp('Nina Sari', 'nina.admin@company.com', 'ADM-FIN-01', 'admin_departemen', 'FIN', 'Admin Departemen Finance', 'MGR-FIN-01');

        // Team manager (level 2) - report ke manager
        $tm1 = $makeEmp('Bagus Pratama', 'bagus.tm@company.com', 'TM-IT-01', 'team_manager', 'IT', 'Team Leader', 'MGR-IT-01');
        $tm2 = $makeEmp('Dewi Risma', 'dewi.tm@company.com', 'TM-IT-02', 'team_manager', 'IT', 'Team Leader', 'MGR-IT-02');
        $finTl = $makeEmp('Mira Andriani', 'mira.tm@company.com', 'TM-FIN-01', 'team_manager', 'FIN', 'Team Leader Finance', 'MGR-FIN-01');

        // User (level 1) - report ke team manager
        $makeEmp('Fajar Nugroho', 'fajar.user@company.com', 'USR-IT-01', 'user', 'IT', 'Staff IT', 'TM-IT-01');
        $makeEmp('Gita Permata', 'gita.user@company.com', 'USR-IT-02', 'user', 'IT', 'Staff IT', 'TM-IT-01');
        $makeEmp('Hendra Wijaya', 'hendra.user@company.com', 'USR-IT-03', 'user', 'IT', 'Staff IT', 'TM-IT-02');
        $kiki = $makeEmp('Kiki Amelia', 'kiki.user@company.com', 'USR-FIN-01', 'user', 'FIN', 'Staff Finance', 'TM-FIN-01');
        $idam = $makeEmp('Ida Ayu', 'ida.user@company.com', 'USR-FIN-02', 'user', 'FIN', 'Staff Finance', 'TM-FIN-01');
        $rani = $makeEmp('Rani Permata', 'rani.user@company.com', 'USR-HR-01', 'user', 'HR', 'Staff HR', null);

        $this->command->info('Created ' . count($empsByNip) . ' employees');

        // ============ SAMPLE SPDs ============
        // 1) SPD IT approved - 1 departemen (IT), sudah ada DPD
        $spd1 = Spd::firstOrCreate(['spd_number' => 'SPD/IT/001/I/2026'], [
            'destination' => 'Jakarta',
            'purpose' => 'Kunjungan kerja ke kantor pusat',
            'start_date' => '2026-01-15',
            'end_date' => '2026-01-19',
            'status' => 'approved',
            'is_cross_department' => false,
            'main_department_id' => $depts['IT']->id,
        ]);
        $spd1->employees()->firstOrCreate(['employee_id' => $empsByNip['MGR-IT-01']->id], ['is_primary' => true, 'status' => 'approved']);
        $spd1->employees()->firstOrCreate(['employee_id' => $empsByNip['TM-IT-01']->id], ['is_primary' => false, 'status' => 'approved']);
        $spd1->employees()->firstOrCreate(['employee_id' => $empsByNip['USR-IT-01']->id], ['is_primary' => false, 'status' => 'approved']);
        $spdApproval->generateApprovalChain($spd1);

        // 2) SPD HR pending - lintas departemen (HR+OP)
        $spd2 = Spd::firstOrCreate(['spd_number' => 'SPD/HR/002/II/2026'], [
            'destination' => 'Bandung',
            'purpose' => 'Rapat koordinasi HR regional',
            'start_date' => '2026-02-10',
            'end_date' => '2026-02-12',
            'status' => 'pending',
            'is_cross_department' => true,
            'main_department_id' => $depts['HR']->id,
        ]);
        $spd2->employees()->firstOrCreate(['employee_id' => $empsByNip['MGR-HR-01']->id], ['is_primary' => true, 'status' => 'pending']);
        $spd2->employees()->firstOrCreate(['employee_id' => $empsByNip['USR-HR-01']->id], ['is_primary' => false, 'status' => 'pending']);
        $spdApproval->generateApprovalChain($spd2);

        // 3) SPD FIN rejected
        $spd3 = Spd::firstOrCreate(['spd_number' => 'SPD/FIN/003/III/2026'], [
            'destination' => 'Surabaya',
            'purpose' => 'Audit keuangan regional',
            'start_date' => '2026-03-01',
            'end_date' => '2026-03-05',
            'status' => 'rejected',
            'is_cross_department' => false,
            'main_department_id' => $depts['FIN']->id,
        ]);
        $spd3->employees()->firstOrCreate(['employee_id' => $empsByNip['MGR-FIN-01']->id], ['is_primary' => true, 'status' => 'rejected']);

        // 4) SPD IT draft (baru, belum diproses)
        $spd4 = Spd::firstOrCreate(['spd_number' => 'SPD/IT/004/IV/2026'], [
            'destination' => 'Yogyakarta',
            'purpose' => 'Pelatihan pengembangan sistem',
            'start_date' => '2026-04-01',
            'end_date' => '2026-04-03',
            'status' => 'pending',
            'is_cross_department' => false,
            'main_department_id' => $depts['IT']->id,
        ]);
        $spd4->employees()->firstOrCreate(['employee_id' => $empsByNip['TM-IT-02']->id], ['is_primary' => true, 'status' => 'pending']);
        $spd4->employees()->firstOrCreate(['employee_id' => $empsByNip['USR-IT-03']->id], ['is_primary' => false, 'status' => 'pending']);
        $spdApproval->generateApprovalChain($spd4);

        $this->command->info('Created sample SPDs');

        // ============ SAMPLE DPDs ============
        $transportCat = DpdExpenseCategory::where('code', 'transport')->first();
        $accomCat = DpdExpenseCategory::where('code', 'accommodation')->first();
        $consumCat = DpdExpenseCategory::where('code', 'consumption')->first();

        // DPD 1 (draft, dari SPD approved IT)
        $dpd1 = Dpd::firstOrCreate(['dpd_number' => 'DPD/IT/001/I/2026'], [
            'spd_id' => $spd1->id,
            'employee_id' => $empsByNip['MGR-IT-01']->id,
            'submission_date' => '2026-01-20',
            'status' => 'draft',
            'total_nominal' => 0,
        ]);
        $dpd1->reports()->firstOrCreate(['title' => 'Laporan Kegiatan Jakarta'], ['description' => 'Kunjungan ke kantor pusat']);
        $dpd1->expenses()->firstOrCreate(['description' => 'Tiket pesawat PP', 'amount' => 2200000, 'expense_date' => '2026-01-15'], ['category_id' => $transportCat->id]);
        $dpd1->expenses()->firstOrCreate(['description' => 'Hotel 4 malam', 'amount' => 3200000, 'expense_date' => '2026-01-15'], ['category_id' => $accomCat->id]);
        $dpd1->recalculateTotal();

        // DPD 2 (draft, DPD sedang diajukan dari SPD pending akan di-reject/approve)
        $dpd2 = Dpd::firstOrCreate(['dpd_number' => 'DPD/FIN/001/IV/2026'], [
            'spd_id' => $spd3->id,
            'employee_id' => $empsByNip['USR-FIN-02']->id,
            'submission_date' => '2026-04-12',
            'status' => 'draft',
            'total_nominal' => 0,
        ]);
        $dpd2->reports()->firstOrCreate(['title' => 'Laporan nota'], ['description' => 'Audit wilayah Surabaya']);
        $dpd2->expenses()->firstOrCreate(['description' => 'Kereta ekonomi', 'amount' => 350000, 'expense_date' => '2026-03-01'], ['category_id' => $transportCat->id]);
        $dpd2->expenses()->firstOrCreate(['description' => 'Konsumsi', 'amount' => 750000, 'expense_date' => '2026-03-02'], ['category_id' => $consumCat->id]);
        $dpd2->recalculateTotal();

        $this->command->info('Created sample DPDs');

        // ============ DELEGASI (GM -> IT Manager 1) ============
        Delegation::firstOrCreate([
            'delegator_id' => $gm->id,
            'delegate_id' => $itMgr1->id,
            'is_active' => true,
        ], [
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'created_by' => $gm->id,
        ]);

        $this->command->info('Test data seeder selesai.');
    }
}