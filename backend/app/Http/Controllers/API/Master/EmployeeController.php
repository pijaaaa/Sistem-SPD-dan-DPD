<?php

namespace App\Http\Controllers\API\Master;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    public function index()
    {
        $employees = Employee::with(['user', 'role', 'department', 'supervisor'])->get();
        return response()->json($employees);
    }

    public function store(StoreEmployeeRequest $request)
    {
        $employee = DB::transaction(function () use ($request) {
            $data = $request->validated();
            
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password'] ?? 'password'),
            ]);

            return Employee::create([
                'user_id' => $user->id,
                'role_id' => $data['role_id'],
                'department_id' => $data['department_id'],
                'supervisor_id' => $data['supervisor_id'] ?? null,
                'nip' => $data['nip'],
                'name' => $data['name'],
                'position' => $data['position'] ?? null,
            ]);
        });
        
        return response()->json($employee->load(['user', 'role', 'department', 'supervisor']), 201);
    }

    public function show(Employee $employee)
    {
        return response()->json($employee->load(['user', 'role', 'department', 'supervisor']));
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee)
    {
        $employee = DB::transaction(function () use ($request, $employee) {
            $data = $request->validated();
            
            $employee->update([
                'role_id' => $data['role_id'],
                'department_id' => $data['department_id'],
                'supervisor_id' => $data['supervisor_id'] ?? null,
                'nip' => $data['nip'],
                'name' => $data['name'],
                'position' => $data['position'] ?? null,
            ]);

            if (isset($data['email'])) {
                $employee->user->update(['email' => $data['email'], 'name' => $data['name']]);
            }
            if (!empty($data['password'])) {
                $employee->user->update(['password' => Hash::make($data['password'])]);
            }

            return $employee;
        });

        return response()->json($employee->load(['user', 'role', 'department', 'supervisor']));
    }

    public function destroy(Employee $employee)
    {
        DB::transaction(function () use ($employee) {
            $user = $employee->user;
            $employee->delete();
            $user->delete();
        });
        
        return response()->json(null, 204);
    }
}
