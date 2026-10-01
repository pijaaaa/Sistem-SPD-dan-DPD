<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$status = $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Mark already-run migrations (tables exist in DB but records missing)
$existing = \DB::table('migrations')->pluck('migration')->toArray();

$needMark = [
    '2026_09_23_021527_create_personal_access_tokens_table',
    '2026_09_23_041753_create_roles_table',
    '2026_09_23_041754_create_role_hierarchies_table',
    '2026_09_23_041755_create_departments_table',
    '2026_09_23_041756_create_employees_table',
    '2026_09_23_052303_create_spds_table',
    '2026_09_23_052304_create_spd_employees_table',
    '2026_09_23_052305_create_spd_approval_chains_table',
    '2026_09_23_052306_create_approval_logs_table',
    '2026_09_23_085512_create_delegations_table',
    '2026_09_23_091517_create_app_settings_table',
    '2026_09_23_091517_create_dpd_expense_categories_table',
    '2026_09_23_091518_create_dpds_table',
    '2026_09_23_091519_create_dpd_expenses_table',
    '2026_09_23_091519_create_dpd_reports_table',
    '2026_09_23_100000_add_main_department_to_spds_table',
    '2026_09_24_000000_create_dpd_approval_chains_table',
    '2026_09_24_000001_create_app_setting_logs_table',
];

$inserted = 0;
foreach ($needMark as $m) {
    if (!in_array($m, $existing)) {
        \DB::table('migrations')->insert(['migration' => $m, 'batch' => 1]);
        $inserted++;
    }
}
echo "Inserted $inserted migration records\n";
echo "Remaining pending (excluding no_pekerja):\n";
$pending = \DB::table('migrations')->pluck('migration')->toArray();
foreach ($needMark as $m) {
    if (!in_array($m, $pending)) {
        echo "  MISSING: $m\n";
    }
}
