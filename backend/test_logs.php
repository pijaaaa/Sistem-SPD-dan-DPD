<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$logs = \App\Models\ApprovalLog::where('approvable_type', \App\Models\SpdApprovalChain::class)->get();
echo "ApprovalLogs count: " . $logs->count() . "\n";
if ($logs->count() > 0) {
    $log = $logs->first();
    echo "Log columns: " . json_encode($log->getAttributes()) . "\n";
}

echo "\nChecking created_at on logs:\n";
foreach($logs as $log) {
    echo "  Log ID " . $log->id . " | created_at: " . ($log->created_at ?? 'NULL') . " | action: " . $log->action . "\n";
}
