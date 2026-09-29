<?php

namespace App\Traits;

use App\Models\Employee;
use App\Models\Role;

trait ApprovalChainGenerator
{
    protected function resolveApprovers(Employee $employee): array
    {
        $employee->load('role', 'department');

        $roleName = $employee->role->name;
        $deptId = $employee->department_id;

        $tmRoleId = Role::where('name', 'team_manager')->value('id');
        $mgrRoleId = Role::where('name', 'manager')->value('id');
        $gmRoleId = Role::where('name', 'general_manager')->value('id');

        $approvers = [];

        if ($roleName === 'user') {
            $tm = Employee::where('role_id', $tmRoleId)->where('department_id', $deptId)->first();
            $mgr = Employee::where('role_id', $mgrRoleId)->where('department_id', $deptId)->first();

            if ($tm) $approvers[] = $tm;
            if ($mgr) $approvers[] = $mgr;
        } elseif ($roleName === 'team_manager') {
            $mgr = Employee::where('role_id', $mgrRoleId)->where('department_id', $deptId)->first();

            if ($mgr) $approvers[] = $mgr;
        } elseif ($roleName === 'manager') {
            $gm = Employee::where('role_id', $gmRoleId)->first();
            if ($gm) $approvers[] = $gm;
        }

        return $approvers;
    }

    protected function createApprovalChainRecord($approvable, ?int $approvableEmployeeId, int $approverEmployeeId, int $levelOrder): void
    {
        $data = [
            'approver_employee_id' => $approverEmployeeId,
            'level_order' => $levelOrder,
            'status' => 'pending',
        ];

        if ($approvableEmployeeId && $this->getEmployeeForeignKey($approvable) === 'spd_employee_id') {
            $data['spd_employee_id'] = $approvableEmployeeId;
        }

        $approvable->approvalChains()->create($data);
    }

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
