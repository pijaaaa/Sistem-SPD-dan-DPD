<?php

namespace App\Services;

use App\Models\Spd;
use App\Models\SpdApprovalChain;
use App\Models\SpdEmployee;
use App\Models\Employee;
use App\Models\Delegation;
use App\Traits\ApprovalChainGenerator;
use Illuminate\Support\Facades\DB;

class SpdApprovalService
{
    use ApprovalChainGenerator;

    public function generateApprovalChain(Spd $spd): void
    {
        $spd->load('employees.employee.role', 'employees.employee.department');

        $needsApproval = false;
        foreach ($spd->employees as $se) {
            $roleName = $se->employee->role->name;
            if (!in_array($roleName, ['general_manager', 'super_admin'])) {
                $needsApproval = true;
            } else {
                $se->update(['status' => 'approved']);
            }
        }

        if (!$needsApproval) {
            $spd->update(['status' => 'approved']);
            SpdEmployee::where('spd_id', $spd->id)->update(['status' => 'approved']);
            return;
        }

        foreach ($spd->employees as $se) {
            $roleName = $se->employee->role->name;
            if (in_array($roleName, ['general_manager', 'super_admin'])) {
                continue;
            }

            $this->createChainForEmployee($spd, $se->id, $se->employee);
        }

        $spd->update(['status' => 'pending']);
        $this->checkSpdStatus($spd);
    }

    protected function createChainForEmployee(Spd $spd, int $spdEmployeeId, Employee $employee): void
    {
        $approvers = $this->resolveApprovers($employee);

        $levelOrder = 1;
        foreach ($approvers as $approver) {
            SpdApprovalChain::create([
                'spd_id' => $spd->id,
                'spd_employee_id' => $spdEmployeeId,
                'approver_employee_id' => $approver->id,
                'level_order' => $levelOrder,
                'status' => 'pending',
            ]);
            $levelOrder++;
        }
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

    public function approve(SpdApprovalChain $chain, Employee $actor): void
    {
        DB::transaction(function () use ($chain, $actor) {
        $this->approveSingleChain($chain, $actor);

        $nextChains = SpdApprovalChain::where('spd_id', $chain->spd_id)
            ->where('spd_employee_id', $chain->spd_employee_id)
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

        $this->checkSpdStatus($chain->spd);
        });
    }

    protected function approveSingleChain(SpdApprovalChain $chain, Employee $actor): void
    {
        $originalApprover = $chain->approver;
        $actualApprover = $this->resolveActualApprover($originalApprover);

        if ($actualApprover->id !== $actor->id && $originalApprover->id !== $actor->id) {
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
    }

    public function reject(SpdApprovalChain $chain, Employee $actor, string $reason): void
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

            // Cancel all pending chains for this SPD
            SpdApprovalChain::where('spd_id', $chain->spd_id)
                ->where('status', 'pending')
                ->update(['status' => 'cancelled']);

            // Cancel all pending SpdEmployee records
            SpdEmployee::where('spd_id', $chain->spd_id)
                ->where('status', 'pending')
                ->update(['status' => 'cancelled']);

            $chain->spd->update(['status' => 'rejected']);
        });
    }

    protected function checkSpdStatus(Spd $spd): void
    {
        $spd->load(['employees.approvalChains', 'employees.employee.role']);

        $allApproved = true;

        foreach ($spd->employees as $se) {
            $roleName = $se->employee->role->name;

            if (in_array($roleName, ['general_manager', 'super_admin'])) {
                if ($se->status !== 'approved') {
                    $se->update(['status' => 'approved']);
                }
                continue;
            }

            $chains = $se->approvalChains;

            if ($chains->isEmpty()) {
                continue;
            }

            $rejected = $chains->where('status', 'rejected')->count() > 0;
            $pending = $chains->where('status', 'pending')->count() > 0;

            if ($rejected) {
                $se->update(['status' => 'rejected']);
                $allApproved = false;
            } elseif ($pending) {
                $allApproved = false;
            } else {
                // All chains approved
                if ($se->status !== 'approved') {
                    $se->update(['status' => 'approved']);
                }
            }
        }

        if (!$allApproved) {
            $hasRejected = $spd->employees()
                ->where('status', 'rejected')
                ->exists();

            if ($hasRejected) {
                $spd->update(['status' => 'rejected']);
            } elseif ($spd->status === 'draft') {
                $spd->update(['status' => 'pending']);
            }
            return;
        }

        // All employees approved
        $spd->update(['status' => 'approved']);
    }

    public function getMyApprovals(Employee $employee)
    {
        $today = now()->toDateString();

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
            ->whereNotExists(function ($subQ) {
                $subQ->selectRaw(1)
                    ->from('spd_approval_chains as sac2')
                    ->whereColumn('sac2.spd_id', 'spd_approval_chains.spd_id')
                    ->whereColumn('sac2.spd_employee_id', 'spd_approval_chains.spd_employee_id')
                    ->whereColumn('sac2.level_order', '<', 'spd_approval_chains.level_order')
                    ->where('sac2.status', '!=', 'approved');
            })
            ->orderBy('level_order')
            ->get();

        $approvals->each(function ($chain) use ($employee, $activeDelegators) {
            if ($chain->approver_employee_id !== $employee->id && $activeDelegators->contains($chain->approver_employee_id)) {
                $chain->setAttribute('delegated_from', $chain->approver);
            }
        });

        return $approvals;
    }
}
