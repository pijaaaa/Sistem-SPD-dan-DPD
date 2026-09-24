<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SpdApprovalChain;
use App\Models\Delegation;
use App\Services\SpdApprovalService;
use Illuminate\Http\Request;

class SpdApprovalController extends Controller
{
    protected $approvalService;

    public function __construct(SpdApprovalService $approvalService)
    {
        $this->approvalService = $approvalService;
    }

    public function myApprovals(Request $request)
    {
        $employee = $request->user()->employee;
        $today = now()->toDateString();

        // Daftar delegator yang mendelegasikan kepada employee ini saat ini
        $activeDelegators = Delegation::where('delegate_id', $employee->id)
            ->where('is_active', true)
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->pluck('delegator_id');

        $approvals = SpdApprovalChain::with(['spd.employees.employee', 'spdEmployee.employee', 'approver'])
            ->where('status', 'pending')
            ->where(function ($q) use ($employee, $activeDelegators) {
                $q->where('approver_employee_id', $employee->id)
                  ->orWhereIn('approver_employee_id', $activeDelegators);
            })
            ->where(function($q) {
                // Pastikan chain sebelumnya sudah approved atau ini level 1
                $q->where('level_order', 1)
                  ->orWhereDoesntHave('spd.approvalChains', function($subQ) {
                      $subQ->whereColumn('spd_approval_chains.spd_id', 'spd_id')
                           ->whereColumn('spd_approval_chains.spd_employee_id', 'spd_employee_id')
                           ->whereColumn('spd_approval_chains.level_order', '<', 'level_order')
                           ->where('status', '!=', 'approved');
                  });
            })
            ->get();

        // Tambahkan info delegasi untuk setiap approval
        $approvals->each(function ($chain) use ($employee, $activeDelegators) {
            if ($chain->approver_employee_id !== $employee->id && $activeDelegators->contains($chain->approver_employee_id)) {
                $chain->setAttribute('delegated_from', $chain->approver);
            }
        });

        return response()->json($approvals);
    }

    public function approvedSpds(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;

        $query = \App\Models\Spd::with(['department', 'employees.employee'])
            ->where('status', 'approved');

        if ($employee && $employee->role->name !== 'super_admin') {
            $query->whereHas('employees', function ($q) use ($employee) {
                $q->where('employee_id', $employee->id);
            });
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function approve(Request $request, SpdApprovalChain $chain)
    {
        try {
            $this->approvalService->approve($chain, $request->user()->employee);
            return response()->json(['message' => 'SPD Approved successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    public function reject(Request $request, SpdApprovalChain $chain)
    {
        $request->validate(['reason' => 'required|string']);
        
        try {
            $this->approvalService->reject($chain, $request->user()->employee, $request->reason);
            return response()->json(['message' => 'SPD Rejected successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }
}
