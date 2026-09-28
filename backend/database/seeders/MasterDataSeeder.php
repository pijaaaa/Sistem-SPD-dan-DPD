<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\RoleHierarchy;
use App\Models\Department;
use App\Models\User;
use App\Models\Employee;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $rolesData = [
            ['name' => 'super_admin', 'level' => 6],
            ['name' => 'general_manager', 'level' => 5],
            ['name' => 'manager', 'level' => 4],
            ['name' => 'team_manager', 'level' => 2],
            ['name' => 'user', 'level' => 1],
        ];

        $roles = [];
        foreach ($rolesData as $data) {
            $roles[$data['name']] = Role::firstOrCreate(
                ['name' => $data['name']],
                ['level' => $data['level']]
            );
        }

        $hierarchy = [
            'user' => 'team_manager',
            'team_manager' => 'manager',
            'manager' => 'general_manager',
            'general_manager' => null,
            'super_admin' => null,
        ];

        foreach ($hierarchy as $roleName => $approverName) {
            RoleHierarchy::firstOrCreate(
                ['role_id' => $roles[$roleName]->id],
                ['next_approver_role_id' => $approverName ? $roles[$approverName]->id : null]
            );
        }

        $departmentData = [
            ['code' => 'IT',            'name' => 'Information Technology'],
            ['code' => 'FINANCE',       'name' => 'FINANCE & ICT'],
            ['code' => 'EKS',            'name' => 'EKS'],
            ['code' => 'EPT',            'name' => 'EPT'],
            ['code' => 'PROD',           'name' => 'PRODUCTION OPERATION'],
            ['code' => 'DWO',            'name' => 'DWO'],
            ['code' => 'QHSE',           'name' => 'QHSE'],
            ['code' => 'HCM',            'name' => 'HCM'],
            ['code' => 'SCM',            'name' => 'SCM'],
            ['code' => 'OPS',            'name' => 'OPERATION SUPPORT'],
            ['code' => 'CORSEC',         'name' => 'CORSEC'],
            ['code' => 'EA',             'name' => 'EA'],
            ['code' => 'SPRM',           'name' => 'SPRM'],
            ['code' => 'IA',             'name' => 'IA'],
        ];

        foreach ($departmentData as $dept) {
            Department::firstOrCreate(['code' => $dept['code']], ['name' => $dept['name']]);
        }

        $departments = Department::all()->keyBy('code');

        $gmUser = User::firstOrCreate(
            ['email' => 'superadmin@example.com'],
            ['name' => 'Super Admin', 'password' => Hash::make('password')]
        );

        $itDept = $departments['IT'];

        Employee::firstOrCreate(
            ['nip' => 'SA001'],
            [
                'user_id' => $gmUser->id,
                'role_id' => $roles['super_admin']->id,
                'department_id' => $itDept->id,
                'name' => 'Super Admin Employee',
                'position' => 'System Administrator',
            ]
        );

        $companyGmUser = User::firstOrCreate(
            ['email' => 'gm@company.com'],
            ['name' => 'General Manager', 'password' => Hash::make('password')]
        );

        Employee::firstOrCreate(
            ['nip' => 'GM-001'],
            [
                'user_id' => $companyGmUser->id,
                'role_id' => $roles['general_manager']->id,
                'department_id' => null,
                'name' => 'General Manager',
                'position' => 'General Manager',
            ]
        );

        $deptCodesForEmployees = [
            'FINANCE', 'EKS', 'EPT', 'PROD', 'DWO', 'QHSE', 'HCM', 'SCM', 'OPS', 'CORSEC', 'EA', 'SPRM', 'IA',
        ];

        foreach ($deptCodesForEmployees as $code) {
            $dept = $departments[$code];

            $mgrUser = User::firstOrCreate(
                ['email' => strtolower($code) . '.mgr@company.com'],
                ['name' => $dept->name . ' Manager', 'password' => Hash::make('password')]
            );

            Employee::firstOrCreate(
                ['nip' => 'MGR-' . $code],
                [
                    'user_id' => $mgrUser->id,
                    'role_id' => $roles['manager']->id,
                    'department_id' => $dept->id,
                    'name' => $dept->name . ' Manager',
                    'position' => $dept->name . ' - Manager',
                ]
            );

            $tmUser = User::firstOrCreate(
                ['email' => strtolower($code) . '.tm@company.com'],
                ['name' => $dept->name . ' Team Manager', 'password' => Hash::make('password')]
            );

            Employee::firstOrCreate(
                ['nip' => 'TM-' . $code],
                [
                    'user_id' => $tmUser->id,
                    'role_id' => $roles['team_manager']->id,
                    'department_id' => $dept->id,
                    'name' => $dept->name . ' Team Manager',
                    'position' => $dept->name . ' - Team Leader',
                ]
            );

            for ($i = 1; $i <= 2; $i++) {
                $staffUser = User::firstOrCreate(
                    ['email' => strtolower($code) . '.staff' . $i . '@company.com'],
                    ['name' => $dept->name . ' Staff ' . $i, 'password' => Hash::make('password')]
                );

                Employee::firstOrCreate(
                    ['nip' => 'USR-' . $code . '-' . $i],
                    [
                        'user_id' => $staffUser->id,
                        'role_id' => $roles['user']->id,
                        'department_id' => $dept->id,
                        'name' => $dept->name . ' Staff ' . $i,
                        'position' => $dept->name . ' - Staff',
                    ]
                );
            }
        }
    }
}
