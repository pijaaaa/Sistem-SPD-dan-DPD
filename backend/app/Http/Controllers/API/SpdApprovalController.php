<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SpdApprovalChain;
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
        $approvals = $this->approvalService->getMyApprovals($employee);

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
