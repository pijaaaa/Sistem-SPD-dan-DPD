<?php

namespace App\Services;

use App\Models\Delegation;
use App\Models\Dpd;
use App\Models\DpdApprovalChain;
use App\Models\Employee;
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
        $dpd->load('employee.role', 'employee.department');

        $approvers = $this->resolveApprovers($dpd->employee);

        if (empty($approvers)) {
            $dpd->update(['status' => 'submitted']);

            return;
        }

        $levelOrder = 1;
        foreach ($approvers as $approver) {
            DpdApprovalChain::create([
                'dpd_id' => $dpd->id,
                'approver_employee_id' => $approver->id,
                'level_order' => $levelOrder,
                'status' => 'pending',
            ]);
            $levelOrder++;
        }

        if ($dpd->status === 'draft') {
            $dpd->update(['status' => 'submitted']);
        }
    }

    public function resolveActualApprover(Employee $originalApprover): Employee
    {
        $today = now()->toDateString();

        $delegation = Delegation::where('delegator_id', $originalApprover->id)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->with('delegate')
            ->first();

        return $delegation ? $delegation->delegate : $originalApprover;
    }

    public function approve(DpdApprovalChain $chain, Employee $actor): void
    {
        DB::transaction(function () use ($chain, $actor) {
            $this->approveSingleChain($chain, $actor);

            $nextChains = DpdApprovalChain::where('dpd_id', $chain->dpd_id)
                ->where('status', 'pending')
                ->where('level_order', '>', $chain->level_order)
                ->orderBy('level_order', 'asc')
                ->get();

            foreach ($nextChains as $nextChain) {
                $originalApprover = $nextChain->approver;
                $actualApprover = $this->resolveActualApprover($originalApprover);
                if ($actualApprover->id === $actor->id || $originalApprover->id === $actor->id) {
                    $this->approveSingleChain($nextChain, $actor);
                } else {
                    break;
                }
            }

            $this->checkDpdStatus($chain->dpd);
        });
    }

    protected function approveSingleChain(DpdApprovalChain $chain, Employee $actor): void
    {
        $originalApprover = $chain->approver;
        $actualApprover = $this->resolveActualApprover($originalApprover);

        if ($actualApprover->id !== $actor->id && $originalApprover->id !== $actor->id) {
            throw new \Exception('Unauthorized approver');
        }

        $chain->update(['status' => 'approved']);

        $actedOnBehalfOf = ($actualApprover->id !== $originalApprover->id) ? $originalApprover->id : null;

        $chain->logs()->create([
            'approver_employee_id' => $actor->id,
            'acted_on_behalf_of' => $actedOnBehalfOf,
            'action' => 'approved',
            'role_at_approval' => $actor->role->name,
        ]);
    }

    public function reject(DpdApprovalChain $chain, Employee $actor, string $reason): void
    {
        DB::transaction(function () use ($chain, $actor, $reason) {
            $originalApprover = $chain->approver;
            $actualApprover = $this->resolveActualApprover($originalApprover);

            if ($actualApprover->id !== $actor->id) {
                throw new \Exception('Unauthorized approver');
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

            DpdApprovalChain::where('dpd_id', $chain->dpd_id)
                ->where('status', 'pending')
                ->update(['status' => 'cancelled']);

            $chain->dpd->update(['status' => 'revisi']);
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
            $dpd->update(['status' => 'revisi']);
        } elseif (! $pending) {
            $dpd->update(['status' => 'approved']);
        }
    }

    public function getMyApprovals(Employee $employee)
    {
        $today = now()->toDateString();

        $activeDelegators = Delegation::where('delegate_id', $employee->id)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->pluck('delegator_id');

        $isDelegator = Delegation::where('delegator_id', $employee->id)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->exists();

        $query = DpdApprovalChain::with(['dpd.spd', 'dpd.employee.user', 'dpd.reports', 'dpd.expenses.category', 'approver.user', 'approver.role'])
            ->where('status', 'pending')
            ->where(function ($q) use ($employee, $activeDelegators) {
                $q->where('approver_employee_id', $employee->id)
                    ->orWhereIn('approver_employee_id', $activeDelegators);
            });

        // Delegator: skip whereNotExists filter so all pending chains are visible
        // (delegator's approval is optional, delegate handles it)
        if (! $isDelegator) {
            $query->whereNotExists(function ($subQ) {
                $subQ->selectRaw(1)
                    ->from('dpd_approval_chains as dac2')
                    ->whereColumn('dac2.dpd_id', 'dpd_approval_chains.dpd_id')
                    ->whereColumn('dac2.level_order', '<', 'dpd_approval_chains.level_order')
                    ->where('dac2.status', '!=', 'approved');
            });
        }

        $approvals = $query->orderByDesc('dpd_id')
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
                    'Rata-rata nominal per hari: Rp%s (maksimal per hari: Rp%s)',
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

    // Required by ApprovalChainGenerator trait for DPD
    protected function getEmployeeForeignKey($approvable): string
    {
        return 'spd_employee_id';
    }

    protected function getChainClass($approvable): string
    {
        $class = class_basename($approvable);

        return "App\\Models\\{$class}ApprovalChain";
    }
}
