<?php

namespace App\Services;

use App\Models\Spd;
use App\Models\SpdEmployee;
use App\Models\SpdApprovalChain;
use App\Models\Employee;
use App\Models\Delegation;
use Illuminate\Support\Facades\DB;

class SpdApprovalService
{
    public function generateApprovalChain(Spd $spd)
    {
        $spd->load('employees.employee.role');

        // Jika GM semua/auto approved, periksa.
        $needsApproval = false;
        foreach ($spd->employees as $se) {
            if ($se->employee->role->name !== 'general_manager' && $se->employee->role->name !== 'super_admin') {
                $needsApproval = true;
                break;
            }
        }

        if (!$needsApproval) {
            $spd->update(['status' => 'approved']);
            SpdEmployee::where('spd_id', $spd->id)->update(['status' => 'approved']);
            return;
        }

        if (!$spd->is_cross_department) {
            // Satu departemen: cari role tertinggi (level terbesar)
            $highestEmployee = null;
            $maxLevel = -1;

            foreach ($spd->employees as $se) {
                if ($se->employee->role->level > $maxLevel) {
                    $maxLevel = $se->employee->role->level;
                    $highestEmployee = $se->employee;
                }
            }

            $this->createChainForEmployee($spd, null, $highestEmployee);
        } else {
            // Lintas departemen: rantai per karyawan
            foreach ($spd->employees as $se) {
                if ($se->employee->role->name !== 'general_manager' && $se->employee->role->name !== 'super_admin') {
                    $this->createChainForEmployee($spd, $se->id, $se->employee);
                } else {
                    $se->update(['status' => 'approved']);
                }
            }
        }
        
        $this->checkSpdStatus($spd);
    }

    private function createChainForEmployee(Spd $spd, ?int $spdEmployeeId, Employee $employee)
    {
        $currentRole = $employee->role;
        $currentEmployee = $employee;
        $levelOrder = 1;

        while ($currentRole && $currentRole->roleHierarchy && $currentRole->roleHierarchy->next_approver_role_id) {
            $nextRole = $currentRole->roleHierarchy->nextApproverRole;
            
            // Cari supervisor dari currentEmployee yang rolenya = $nextRole
            // Jika supervisor langsung tidak cocok, naik terus
            $supervisor = $currentEmployee->supervisor;
            while ($supervisor && $supervisor->role_id !== $nextRole->id) {
                $supervisor = $supervisor->supervisor;
            }

            if ($supervisor) {
                SpdApprovalChain::create([
                    'spd_id' => $spd->id,
                    'spd_employee_id' => $spdEmployeeId,
                    'approver_employee_id' => $supervisor->id,
                    'level_order' => $levelOrder,
                ]);
                $levelOrder++;
                $currentRole = $nextRole;
                $currentEmployee = $supervisor;
            } else {
                // Break jika tidak ada supervisor yang cocok di atasnya (fallback/error handle)
                break;
            }
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

        if ($delegation) {
            return $delegation->delegate;
        }

        return $originalApprover;
    }

    public function approve(SpdApprovalChain $chain, Employee $actor)
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

            $this->checkSpdStatus($chain->spd);
        });
    }

    public function reject(SpdApprovalChain $chain, Employee $actor, string $reason)
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
                'rejection_reason' => $reason
            ]);

            // Batalkan semua chain lain yang pending untuk SPD ini (atau SpdEmployee ini)
            if ($chain->spd->is_cross_department) {
                SpdApprovalChain::where('spd_employee_id', $chain->spd_employee_id)
                    ->where('status', 'pending')
                    ->update(['status' => 'cancelled']);
                
                $chain->spdEmployee->update(['status' => 'rejected']);
            } else {
                SpdApprovalChain::where('spd_id', $chain->spd->id)
                    ->where('status', 'pending')
                    ->update(['status' => 'cancelled']);
            }

            $this->checkSpdStatus($chain->spd);
        });
    }

    private function checkSpdStatus(Spd $spd)
    {
        if (!$spd->is_cross_department) {
            $rejected = SpdApprovalChain::where('spd_id', $spd->id)->where('status', 'rejected')->exists();
            if ($rejected) {
                $spd->update(['status' => 'rejected']);
                SpdEmployee::where('spd_id', $spd->id)->update(['status' => 'rejected']);
                return;
            }

            $pending = SpdApprovalChain::where('spd_id', $spd->id)->where('status', 'pending')->exists();
            if (!$pending) {
                $spd->update(['status' => 'approved']);
                SpdEmployee::where('spd_id', $spd->id)->update(['status' => 'approved']);
            } else {
                if ($spd->status === 'draft') $spd->update(['status' => 'pending']);
            }
        } else {
            // Cek status per SpdEmployee
            foreach ($spd->employees as $se) {
                if ($se->status === 'cancelled' || $se->employee->role->name === 'general_manager' || $se->employee->role->name === 'super_admin') {
                    continue;
                }
                
                $rejected = SpdApprovalChain::where('spd_employee_id', $se->id)->where('status', 'rejected')->exists();
                if ($rejected) {
                    $se->update(['status' => 'rejected']);
                    continue;
                }

                $pending = SpdApprovalChain::where('spd_employee_id', $se->id)->where('status', 'pending')->exists();
                if (!$pending && SpdApprovalChain::where('spd_employee_id', $se->id)->count() > 0) {
                    $se->update(['status' => 'approved']);
                }
            }

            // Status akhir SPD
            $allEmployees = $spd->employees()->get();
            $hasRejected = $allEmployees->where('status', 'rejected')->count() > 0;
            $allApproved = $allEmployees->where('status', 'approved')->count() === $allEmployees->count();

            if ($hasRejected) {
                $spd->update(['status' => 'rejected']);
                // Batal semua chain dan employee lain jika 1 tertolak
                SpdApprovalChain::where('spd_id', $spd->id)->where('status', 'pending')->update(['status' => 'cancelled']);
                SpdEmployee::where('spd_id', $spd->id)->where('status', 'pending')->update(['status' => 'cancelled']);
            } elseif ($allApproved) {
                $spd->update(['status' => 'approved']);
            } else {
                if ($spd->status === 'draft') $spd->update(['status' => 'pending']);
            }
        }
    }
}