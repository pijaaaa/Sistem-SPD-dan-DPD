<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== SPD Approval Chains Verification ===\n\n";

// SPD 1: Single department (FINANCE user)
$spd1 = App\Models\Spd::where('spd_number','SPD/TEST/001/IX/2026')->first();
echo "SPD #1: " . $spd1->spd_number . " - Status: " . $spd1->status . " - Cross: " . ($spd1->is_cross_department ? 'Yes' : 'No') . "\n";

$chains1 = App\Models\SpdApprovalChain::where('spd_id',$spd1->id)->orderBy('level_order')->get();
echo "Chains for SPD #1: " . $chains1->count() . "\n";
foreach($chains1 as $c) {
    $se = App\Models\SpdEmployee::find($c->spd_employee_id);
    $emp = $se ? $se->employee : null;
    echo "  Level " . $c->level_order . ": spd_employee_id=" . $c->spd_employee_id 
        . " | approver_id=" . $c->approver_employee_id 
        . " | approver=" . ($emp ? $emp->name . " (" . $emp->role->name . ")" : "N/A")
        . " | status=" . $c->status . PHP_EOL;
}

// SPD 2: Cross-department (FINANCE + EKS user + EKS staff)
$spd2 = App\Models\Spd::where('spd_number','SPD/TEST/002/IX/2026')->first();
echo "\nSPD #2: " . $spd2->spd_number . " - Status: " . $spd2->status . " - Cross: " . ($spd2->is_cross_department ? 'Yes' : 'No') . "\n";

$chains2 = App\Models\SpdApprovalChain::where('spd_id',$spd2->id)->orderBy('level_order')->get();
echo "Chains for SPD #2: " . $chains2->count() . "\n";
foreach($chains2 as $c) {
    $se = App\Models\SpdEmployee::find($c->spd_employee_id);
    $emp = $se ? $se->employee : null;
    echo "  Level " . $c->level_order . ": spd_employee_id=" . $c->spd_employee_id 
        . " | approver_id=" . $c->approver_employee_id 
        . " | approver=" . ($emp ? $emp->name . " (" . $emp->role->name . ")" : "N/A")
        . " | status=" . $c->status . PHP_EOL;
}

echo "\n=== Verification ===\n";
echo "Each spd_employee_id has its own chain:\n";
$spd1_employees = array_unique(array_column($chains1->toArray(), 'spd_employee_id'));
$spd2_employees = array_unique(array_column($chains2->toArray(), 'spd_employee_id'));
echo "SPD #1 spd_employee_ids: " . implode(', ', $spd1_employees) . PHP_EOL;
echo "SPD #2 spd_employee_ids: " . implode(', ', $spd2_employees) . PHP_EOL;
echo "No cross-contamination: " . (count($spd1_employees) === 1 && count($spd2_employees) === 2 ? "YES" : "NO") . PHP_EOL;