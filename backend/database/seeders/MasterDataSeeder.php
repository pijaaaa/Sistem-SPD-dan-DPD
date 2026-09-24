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
            ['name' => 'admin_departemen', 'level' => 3],
            ['name' => 'team_manager', 'level' => 2],
            ['name' => 'user', 'level' => 1],
        ];

        $roles = [];
        foreach ($rolesData as $data) {
            $roles[$data['name']] = Role::create($data);
        }

        $hierarchy = [
            'user' => 'team_manager',
            'team_manager' => 'manager',
            'admin_departemen' => 'manager',
            'manager' => 'general_manager',
            'general_manager' => null,
            'super_admin' => null,
        ];

        foreach ($hierarchy as $roleName => $approverName) {
            RoleHierarchy::create([
                'role_id' => $roles[$roleName]->id,
                'next_approver_role_id' => $approverName ? $roles[$approverName]->id : null,
            ]);
        }

        $dept = Department::create(['code' => 'IT', 'name' => 'Information Technology']);

        $superAdminUser = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('password'),
        ]);

        Employee::create([
            'user_id' => $superAdminUser->id,
            'role_id' => $roles['super_admin']->id,
            'department_id' => $dept->id,
            'nip' => 'SA001',
            'name' => 'Super Admin Employee',
            'position' => 'System Administrator'
        ]);
    }
}
