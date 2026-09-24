<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DpdApprovalChain;
use App\Models\Dpd;
use App\Services\AppSettingService;
use Illuminate\Http\Request;

class DpdApprovalController extends Controller
{
    protected $dpdApprovalService;

    public function __construct(DpdApprovalService $dpdApprovalService)
    {
        $this->dpdApprovalService = $dpdApprovalService;
    }

    public function myApprovals(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User tidak memiliki data employee.'], 403);
        }

        $approvals = $this->dpdApprovalService->getMyApprovals($employee);

        return response()->json($approvals);
    }

    public function approve(Request $request, DpdApprovalChain $chain)
    {
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User tidak memiliki data employee.'], 403);
        }

        try {
            $this->dpdApprovalService->approve($chain, $employee);
            return response()->json(['message' => 'DPD berhasil di-approve.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    public function reject(Request $request, DpdApprovalChain $chain)
    {
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User tidak memiliki data employee.'], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:10|max:1000',
        ]);

        try {
            $this->dpdApprovalService->reject($chain, $employee, $validated['reason']);
            return response()->json(['message' => 'DPD berhasil di-reject.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }

    public function generateApprovalChain(Dpd $dpd)
    {
        $this->dpdApprovalService->generateApprovalChain($dpd);
        return response()->json(['message' => 'Approval chain generated.']);
    }

    public function validateSubmission(Request $request)
    {
        $validated = $request->validate([
            'dpd_id' => 'required|exists:dpds,id',
        ]);

        $dpd = Dpd::findOrFail($validated['dpd_id']);

        if ($dpd->spd->status !== 'approved') {
            return response()->json(['message' => 'SPD belum approved.'], 422);
        }

        $deadlineValid = $this->dpdApprovalService->validateSubmissionDeadline($dpd);
        if (!$deadlineValid) {
            $deadlineDays = app(AppSettingService::class)->getDpdSubmissionDeadlineDays();
            return response()->json([
                'message' => 'DPD sudah melewati batas waktu pengajuan (' . $deadlineDays . ' hari setelah SPD selesai).'
            ], 422);
        }

        $warnings = $this->dpdApprovalService->validateDpdSubmission($dpd);

        return response()->json([
            'valid' => true,
            'warnings' => $warnings,
            'deadline_valid' => $deadlineValid,
        ]);
    }
}
