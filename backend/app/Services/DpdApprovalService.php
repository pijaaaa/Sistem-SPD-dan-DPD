<?php

namespace App\Services;

use App\Models\Dpd;
use App\Models\DpdApprovalChain;
use App\Models\Employee;
use App\Models\Delegation;
use App\Models\ApprovalLog;
use App\Traits\ApprovalChainGenerator;
use Illuminate\Support\Facades\DB;

class DpdApprovalService
{
    use ApprovalChainGenerator;

    protected $appSettingService;

    public function __construct(AppSettingService $appSettingService)
    {
        $this->appSettingService = $appSettingService;
    }

    public function generateApprovalChain(Dpd $dpd): void
    {
        $dpd->load('spd.employees.employee.role');

        if ($this->shouldAutoApprove($dpd)) {
            $dpd->update(['status' => 'approved']);
            return;
        }

        $spd = $dpd->spd;
        $highestEmployee = $this->getHighestRoleEmployee($spd);

        if ($highestEmployee && $highestEmployee->role->name !== 'general_manager') {
            $this->generateApprovalChainForEmployee($dpd, null, $highestEmployee);
        }

        $this->checkDpdStatus($dpd);
    }

    protected function shouldAutoApprove(Dpd $dpd): bool
    {
        $spd = $dpd->spd;
        foreach ($spd->employees as $se) {
            $employee = $se->employee;
            if ($employee->role->name !== 'general_manager' && $employee->role->name !== 'super_admin') {
                return false;
            }
        }
        return true;
    }

    protected function getHighestRoleEmployee($spd): ?Employee
    {
        $highest = null;
        $maxLevel = -1;
        foreach ($spd->employees as $se) {
            if ($se->employee->role->level > $maxLevel) {
                $maxLevel = $se->employee->role->level;
                $highest = $se->employee;
            }
        }
        return $highest;
    }

    public function resolveActualApprover(Employee $originalApprover): Employee
    {
        $today = now()->toDateString();
        $delegation = Delegation::where('delegator_id', $originalApprover->id)
            ->where('is_active', true)
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->with('delegate')
            ->first();

        return $delegation ? $delegation->delegate : $originalApprover;
    }

    public function approve(DpdApprovalChain $chain, Employee $actor): void
    {
        DB::transaction(function () use ($chain, $actor) {
            $originalApprover = $chain->approver;
            $actualApprover = $this->resolveActualApprover($originalApprover);
            
            if ($actualApprover->id !== $actor->id) {
                throw new \Exception("Unauthorized approver");
            }

            $chain->update(['status' => 'approved']);
            
            $actedOnBehalfOf = ($actualApprover->id !== $originalApprover->id) ? $originalApprover->id : null;
            
            $chain->logs()->create([
                'approver_employee_id' => $actor->id,
                'acted_on_behalf_of' => $actedOnBehalfOf,
                'action' => 'approved',
                'role_at_approval' => $actor->role->name,
            ]);

            $this->checkDpdStatus($chain->dpd);
        });
    }

    public function reject(DpdApprovalChain $chain, Employee $actor, string $reason): void
    {
        DB::transaction(function () use ($chain, $actor, $reason) {
            $originalApprover = $chain->approver;
            $actualApprover = $this->resolveActualApprover($originalApprover);
            
            if ($actualApprover->id !== $actor->id) {
                throw new \Exception("Unauthorized approver");
            }

            $chain->update(['status' => 'rejected']);
            
            $actedOnBehalfOf = ($actualApprover->id !== $originalApprover->id) ? $originalApprover->id : null;
            
            $chain->logs()->create([
                'approver_employee_id' => $actor->id,
                'acted_on_behalf_of' => $actedOnBehalfOf,
                'action' => 'rejected',
                'role_at_approval' => $actor->role->name,
                'rejection_reason' => $reason,
            ]);

            $chain->dpd->update(['status' => 'rejected']);
        });
    }

    protected function checkDpdStatus(Dpd $dpd): void
    {
        $chains = $dpd->approvalChains;
        if ($chains->isEmpty()) {
            return;
        }

        $rejected = $chains->where('status', 'rejected')->count() > 0;
        $pending = $chains->where('status', 'pending')->count() > 0;

        if ($rejected) {
            $dpd->update(['status' => 'rejected']);
        } elseif (!$pending) {
            $dpd->update(['status' => 'approved']);
        }
    }

    public function getMyApprovals(Employee $employee)
    {
        $today = now()->toDateString();

        $activeDelegators = Delegation::where('delegate_id', $employee->id)
            ->where('is_active', true)
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->pluck('delegator_id');

        $approvals = DpdApprovalChain::with(['dpd.spd', 'dpd.employee.user', 'dpd.reports', 'dpd.expenses.category', 'approver.user'])
            ->where('status', 'pending')
            ->where(function ($q) use ($employee, $activeDelegators) {
                $q->where('approver_employee_id', $employee->id)
                  ->orWhereIn('approver_employee_id', $activeDelegators);
            })
            ->where(function ($q) {
                $q->where('level_order', 1)
                  ->orWhereDoesntHave('dpd.approvalChains', function ($subQ) {
                      $subQ->whereColumn('dpd_approval_chains.dpd_id', 'dpd_id')
                           ->whereColumn('dpd_approval_chains.level_order', '<', 'level_order')
                           ->where('status', '!=', 'approved');
                  });
            })
            ->orderBy('level_order')
            ->get();

        $approvals->each(function ($chain) use ($employee, $activeDelegators) {
            if ($chain->approver_employee_id !== $employee->id && $activeDelegators->contains($chain->approver_employee_id)) {
                $chain->setAttribute('delegated_from', $chain->approver);
            }
            $chain->dpd->warnings = $this->validateDpdSubmission($chain->dpd);
        });

        return $approvals;
    }

    public function validateDpdSubmission(Dpd $dpd): array
    {
        $warnings = [];
        
        $spd = $dpd->spd;
        $tripDays = $spd->start_date->diffInDays($spd->end_date) + 1;
        $maxNominalPerDay = $this->appSettingService->getMaxNominalPerDay();
        
        if ($maxNominalPerDay > 0 && $tripDays > 0) {
            $averageNominal = $dpd->total_nominal / $tripDays;
            if ($averageNominal > $maxNominalPerDay) {
                $warnings[] = sprintf(
                    "Rata-rata nominal per hari: Rp%s (maksimal per hari: Rp%s)",
                    number_format($averageNominal, 0),
                    number_format($maxNominalPerDay, 0)
                );
            }
        }

        return $warnings;
    }

    public function validateSubmissionDeadline(Dpd $dpd): bool
    {
        $deadlineDays = $this->appSettingService->getDpdSubmissionDeadlineDays();
        $deadline = $dpd->spd->end_date->addDays($deadlineDays);
        return now()->lte($deadline);
    }
}
