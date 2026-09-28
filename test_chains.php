<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$chains = App\Models\SpdApprovalChain::where('status','pending')->take(10)->get();
foreach($chains as $c) {
    echo "SPD: " . $c->spd_id . " spd_employee: " . $c->spd_employee_id . " level: " . $c->level_order . " approver: " . $c->approver_employee_id . " status: " . $c->status . PHP_EOL;
}