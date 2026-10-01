<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EmployeeNoPekerjaTest extends TestCase
{
    use RefreshDatabase;

    private $dept;
    private $role;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dept = Department::create(['code' => 'IT', 'name' => 'IT']);
        $this->role = Role::create(['name' => 'manager', 'level' => 4]);
    }

    private function createUserAndEmployee($name, $noPekerja = null)
    {
        $user = User::create([
            'name' => $name,
            'email' => strtolower($name) . '@test.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $data = [
            'user_id' => $user->id,
            'role_id' => $this->role->id,
            'department_id' => $this->dept->id,
            'nip' => 'NIP-' . rand(1000, 9999),
            'name' => $name,
        ];

        if ($noPekerja) {
            $data['no_pekerja'] = $noPekerja;
        }

        return Employee::create($data);
    }

    public function test_employee_can_be_created_with_no_pekerja(): void
    {
        $emp = $this->createUserAndEmployee('John Doe', 'PK-001');

        $this->assertEquals('PK-001', $emp->no_pekerja);
        $this->assertEquals('PK-001', $emp->employee_number);
    }

    public function test_employee_number_accessor_falls_back_to_no_pekerja(): void
    {
        $emp = $this->createUserAndEmployee('Jane Doe', 'PK-002');

        $this->assertEquals('PK-002', $emp->employee_number);
        $this->assertEquals('PK-002', $emp->no_pekerja);
    }

    public function test_employee_without_no_pekerja_has_auto_generated_number(): void
    {
        $emp = $this->createUserAndEmployee('Bob Smith');

        // Observer auto-generates no_pekerja as EMP-xxxxx
        $this->assertStringStartsWith('EMP-', $emp->no_pekerja);
        $this->assertEquals($emp->no_pekerja, $emp->employee_number);
    }

    public function test_no_pekerja_is_unique(): void
    {
        $this->createUserAndEmployee('Alice', 'PK-003');

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->createUserAndEmployee('Charlie', 'PK-003');
    }
}
