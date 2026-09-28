<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

Auth::guard('web')->login(\App\Models\User::find(5)); // finance.staff1
$dpdId = isset($_GET['id']) ? (int)$_GET['id'] : 1;
$dpd = \App\Models\Dpd::with(['spd', 'employee.user', 'reports', 'expenses.category'])->find($dpdId);
echo "DPD ID: $dpdId\n";
echo "dpd_number: " . ($dpd->dpd_number ?? 'null') . "\n";
echo "status: " . $dpd->status . "\n";
echo "total_nominal: " . ($dpd->total_nominal ?? 'null') . "\n";
echo "spd_number: " . ($dpd->spd ? $dpd->spd->spd_number : 'null') . "\n";
echo "reports count: " . $dpd->reports->count() . "\n";
echo "expenses count: " . $dpd->expenses->count() . "\n";
echo "expenses: "; print_r($dpd->expenses->toArray());
echo "reports: "; print_r($dpd->reports->toArray());