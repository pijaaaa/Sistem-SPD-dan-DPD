<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Spd;
use App\Models\SpdEmployee;
use App\Models\Department;
use App\Http\Requests\StoreSpdRequest;
use App\Services\SpdNumberGeneratorService;
use App\Services\SpdApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class SpdController extends Controller
{
    protected $numberGenerator;
    protected $approvalService;

    public function __construct(SpdNumberGeneratorService $numberGenerator, SpdApprovalService $approvalService)
    {
        $this->numberGenerator = $numberGenerator;
        $this->approvalService = $approvalService;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;

        $query = Spd::with(['department', 'employees.employee'])
            ->orderByDesc('created_at');

        // Filter berdasarkan status
        if ($request->has('status') && $request->status !== '' && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Non-super admin: hanya SPD yang melibatkan dirinya
        if ($employee && $employee->role->name !== 'super_admin') {
            $query->whereHas('employees', function ($q) use ($employee) {
                $q->where('employee_id', $employee->id);
            });
        }

        return response()->json($query->get());
    }

    public function store(StoreSpdRequest $request)
    {
        $validated = $request->validated();
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User tidak memiliki data employee.'], 403);
        }

        // Cek hak akses: admin_departemen atau super_admin boleh membuat SPD
        $allowedRoles = ['admin_departemen', 'super_admin'];
        if (!in_array($employee->role->name, $allowedRoles)) {
            return response()->json([
                'message' => 'Hanya admin departemen yang dapat membuat SPD.'
            ], 403);
        }

        $spd = DB::transaction(function () use ($validated, $request) {
            // Hitung is_cross_department: apakah semua peserta berasal dari departemen yang sama?
            $isCrossDepartment = false;
            $departmentIds = [];
            $employeeIds = array_column($validated['employees'], 'employee_id');

            $employees = \App\Models\Employee::whereIn('id', $employeeIds)->get();
            foreach ($employees as $emp) {
                $departmentIds[] = $emp->department_id;
            }
            $isCrossDepartment = count(array_unique($departmentIds)) > 1;

            $spd = Spd::create([
                'destination' => $validated['destination'],
                'purpose' => $validated['purpose'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'status' => 'pending',
                'is_cross_department' => $isCrossDepartment,
                'main_department_id' => $validated['main_department_id'],
            ]);

            foreach ($validated['employees'] as $empData) {
                SpdEmployee::create([
                    'spd_id' => $spd->id,
                    'employee_id' => $empData['employee_id'],
                    'is_primary' => !empty($empData['is_primary']),
                    'status' => 'pending',
                ]);
            }

            $spd->refresh();

            // Generate approval chain (M4 logic)
            $this->approvalService->generateApprovalChain($spd);

            return $spd;
        });

        return response()->json($spd->load(['department', 'employees.employee']), 201);
    }

    public function show(Spd $spd)
    {
        $spd->load(['department', 'employees.employee.user', 'approvalChains.approver.user', 'approvalLogs']);

        return response()->json($spd);
    }
}