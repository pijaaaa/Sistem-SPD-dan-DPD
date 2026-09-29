echo App\Models\Employee::with(['user', 'role'])->get()->map(function(\) { return \->user->name . ' - ' . \->role->name; })->toJson();
