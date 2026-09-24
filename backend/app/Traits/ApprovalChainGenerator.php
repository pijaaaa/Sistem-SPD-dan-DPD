<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Model;

trait ApprovalChainGenerator
{
    public function generateApprovalChainForEmployee(Model $approvable, ?int $approvableEmployeeId, $employee)
    {
        $currentRole = $employee->role;
        $currentEmployee = $employee;
        $levelOrder = 1;

        while ($currentRole && $currentRole->roleHierarchy && $currentRole->roleHierarchy->next_approver_role_id) {
            $nextRole = $currentRole->roleHierarchy->nextApproverRole;
            
            $supervisor = $currentEmployee->supervisor;
            while ($supervisor && $supervisor->role_id !== $nextRole->id) {
                $supervisor = $supervisor->supervisor;
            }

            if ($supervisor) {
                $this->createApprovalChainRecord($approvable, $approvableEmployeeId, $supervisor->id, $levelOrder);
                $levelOrder++;
                $currentRole = $nextRole;
                $currentEmployee = $supervisor;
            } else {
                break;
            }
        }
    }

    protected function createApprovalChainRecord(Model $approvable, ?int $approvableEmployeeId, int $approverEmployeeId, int $levelOrder)
    {
        $chainClass = $this->getChainClass($approvable);
        $data = [
            'approver_employee_id' => $approverEmployeeId,
            'level_order' => $levelOrder,
        ];

        if ($approvableEmployeeId) {
            $data[$this->getEmployeeForeignKey()] = $approvableEmployeeId;
        }

        $approvable->approvalChains()->create($data);
    }

    protected function getChainClass(Model $approvable)
    {
        $class = class_basename($approvable);
        return "App\\Models\\{$class}ApprovalChain";
    }

    protected function getEmployeeForeignKey()
    {
        return 'spd_employee_id';
    }
}
