<?php
// Quick check: what employees exist and their departments
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Employees per role+dept:\n";
$employees = App\Models\Employee::with(['role','department'])->get();
foreach($employees as $e) {
    echo $e->name . " (" . $e->role->name . ") dept=" . ($e->department ? $e->department->code : 'NULL') . "\n";
}
echo "\nTotal: " . count($employees) . "\n";