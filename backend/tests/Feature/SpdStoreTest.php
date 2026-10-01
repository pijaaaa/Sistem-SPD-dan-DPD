<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Role;
use App\Models\Spd;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SpdStoreTest extends TestCase
{
    use RefreshDatabase;

    private $dept;
    private $role;
    private $user;
    private $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dept = Department::create(['code' => 'IT', 'name' => 'IT']);
        $this->role = Role::create(['name' => 'user', 'level' => 1]);

        $this->user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $this->employee = Employee::create([
            'user_id' => $this->user->id,
            'role_id' => $this->role->id,
            'department_id' => $this->dept->id,
            'nip' => 'NIP-001',
            'no_pekerja' => 'EMP-00001',
            'name' => 'Test User',
        ]);
    }

    public function test_spd_store_validates_destination_required(): void
    {
        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->user)
            ->postJson('/api/spd', [
                'purpose' => 'Test purpose',
                'start_date' => '2026-06-01',
                'end_date' => '2026-06-03',
                'employees' => [
                    ['employee_id' => $this->employee->id, 'is_primary' => true],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['destination']);
    }

    public function test_spd_store_validates_employees_required(): void
    {
        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->user)
            ->postJson('/api/spd', [
                'destination' => 'Jakarta',
                'purpose' => 'Test purpose',
                'start_date' => '2026-06-01',
                'end_date' => '2026-06-03',
                'employees' => [],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['employees']);
    }

    public function test_spd_store_success(): void
    {
        $response = $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->user)
            ->postJson('/api/spd', [
                'destination' => 'Jakarta',
                'purpose' => 'Rapat',
                'start_date' => '2026-06-01',
                'end_date' => '2026-06-03',
                'employees' => [
                    ['employee_id' => $this->employee->id, 'is_primary' => true],
                ],
            ]);

        $response->assertCreated();
        $response->assertJsonStructure(['id', 'destination', 'purpose', 'start_date', 'end_date']);
    }

    public function test_spd_store_validates_is_primary_boolean(): void
    {
        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->user)
            ->postJson('/api/spd', [
                'destination' => 'Jakarta',
                'purpose' => 'Rapat',
                'start_date' => '2026-06-01',
                'end_date' => '2026-06-03',
                'employees' => [
                    ['employee_id' => $this->employee->id, 'is_primary' => 'invalid_boolean'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['employees.0.is_primary']);
    }
}
