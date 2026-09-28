<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::where('email','finance.staff1@company.com')->first();
if (!$user) {
    echo "User not found\n";
    // list some users
    foreach (App\Models\User::limit(5)->get() as $u) {
        echo "User: " . $u->email . "\n";
    }
    exit;
}
$employee = $user->employee;
echo "Employee: " . $employee->name . ", Role: " . $employee->role->name . ", Dept: " . $employee->department->code . PHP_EOL;

// Test validation
$validated = [
    'destination' => 'Test Destination',
    'purpose' => 'Test Purpose', 
    'start_date' => '2026-01-15',
    'end_date' => '2026-01-19',
    'employees' => [
        ['employee_id' => $employee->id, 'is_primary' => true]
    ],
    'main_department_id' => $employee->department_id,
];

$rules = [
    'destination' => 'required|string|max:255',
    'purpose' => 'required|string|max:1000',
    'start_date' => 'required|date|before_or_equal:end_date',
    'end_date' => 'required|date|after_or_equal:start_date',
    'employees' => 'required|array|min:1',
    'employees.*.employee_id' => 'required|exists:employees,id',
    'employees.*.is_primary' => 'sometimes|boolean',
    'main_department_id' => 'nullable|exists:departments,id',
];

$validator = new \Illuminate\Validation\Validator(
    new \Illuminate\Http\Request($validated, []),
    $rules
);

if ($validator->fails()) {
    echo "Validation failed: " . PHP_EOL;
    foreach ($validator->errors()->all() as $error) {
        echo " - " . $error . PHP_EOL;
    }
} else {
    echo "Validation passed!" . PHP_EOL;
}