<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Role;
use App\Models\Spd;
use App\Models\SpdEmployee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EmployeeOnTripTest extends TestCase
{
    use RefreshDatabase;

    private $dept;
    private $role;
    private $user;
    private $requester;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dept = Department::create(['code' => 'IT', 'name' => 'IT']);
        $this->role = Role::create(['name' => 'user', 'level' => 1]);

        $this->user = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        // Requestor must own an Employee record with an allowed role
        // otherwise SpdController@store returns 403 before validation runs.
        $this->requester = Employee::create([
            'user_id' => $this->user->id,
            'role_id' => $this->role->id,
            'department_id' => $this->dept->id,
            'nip' => 'NIP-REQUESTER',
            'name' => 'Admin',
        ]);
    }

    private function makeEmployee(string $name): Employee
    {
        $u = User::create([
            'name' => $name,
            'email' => strtolower($name) . '@test.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        return Employee::create([
            'user_id' => $u->id,
            'role_id' => $this->role->id,
            'department_id' => $this->dept->id,
            'nip' => 'NIP-' . $name,
            'name' => $name,
        ]);
    }

    private function makeSpd(Employee $emp, string $start, string $end, string $status = 'approved'): Spd
    {
        $spd = Spd::create([
            'destination' => 'Jakarta',
            'purpose' => 'Test',
            'start_date' => $start,
            'end_date' => $end,
            'status' => $status,
            'is_cross_department' => false,
            'main_department_id' => $this->dept->id,
        ]);

        SpdEmployee::create([
            'spd_id' => $spd->id,
            'employee_id' => $emp->id,
            'is_primary' => true,
            'status' => 'approved',
        ]);

        return $spd;
    }

    // ---------------------------------------------------------------
    // Regression: is_on_trip must be present in the API payload
    // ---------------------------------------------------------------

    public function test_employees_api_payload_includes_is_on_trip_key(): void
    {
        $emp = $this->makeEmployee('Budi');

        $response = $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->user)
            ->getJson('/api/master/employees');

        $response->assertOk();

        $row = collect($response->json())->firstWhere('id', $emp->id);
        $this->assertNotNull($row, 'Employee tidak ditemukan di response.');
        $this->assertArrayHasKey('is_on_trip', $row, 'Key is_on_trip hilang dari response.');
        $this->assertFalse($row['is_on_trip']);
    }

    public function test_employee_on_active_trip_is_flagged_true(): void
    {
        $emp = $this->makeEmployee('Siti');
        $this->makeSpd($emp, now()->subDays(2)->toDateString(), now()->addDays(3)->toDateString());

        $this->assertTrue($emp->fresh()->is_on_trip);
    }

    public function test_employee_is_not_on_trip_after_spd_ends(): void
    {
        $emp = $this->makeEmployee('Rudi');
        $this->makeSpd($emp, now()->subDays(10)->toDateString(), now()->subDays(1)->toDateString());

        $this->assertFalse($emp->fresh()->is_on_trip);
    }

    public function test_employee_is_not_on_trip_before_spd_starts(): void
    {
        $emp = $this->makeEmployee('Andi');
        $this->makeSpd($emp, now()->addDays(3)->toDateString(), now()->addDays(6)->toDateString());

        $this->assertFalse($emp->fresh()->is_on_trip);
    }

    public function test_rejected_spd_does_not_flag_on_trip(): void
    {
        $emp = $this->makeEmployee('Tono');
        $this->makeSpd($emp, now()->toDateString(), now()->addDays(5)->toDateString(), 'rejected');

        $this->assertFalse($emp->fresh()->is_on_trip);
    }

    public function test_employee_on_trip_cannot_be_added_to_new_spd(): void
    {
        $busy = $this->makeEmployee('Busy');
        $this->makeSpd($busy, now()->toDateString(), now()->addDays(5)->toDateString());

        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->user)
            ->postJson('/api/spd', [
                'destination' => 'Bandung',
                'purpose' => 'Rapat',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays(2)->toDateString(),
                'employees' => [
                    ['employee_id' => $this->requester->id, 'is_primary' => true],
                    ['employee_id' => $busy->id, 'is_primary' => false],
                ],
            ])
            ->assertStatus(422);
    }
}