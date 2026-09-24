<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Spd;
use App\Models\SpdEmployee;
use App\Models\SpdApprovalChain;
use App\Models\Employee;
use App\Models\Role;
use App\Models\RoleHierarchy;
use App\Models\User;
use App\Models\Department;
use App\Models\Delegation;
use App\Services\SpdApprovalService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SpdApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new SpdApprovalService();
        $this->setupHierarchy();
    }

    private function setupHierarchy()
    {
        $dept = Department::create(['code' => 'IT', 'name' => 'IT']);
        
        $roles = [
            'gm' => Role::create(['name' => 'general_manager', 'level' => 5]),
            'manager' => Role::create(['name' => 'manager', 'level' => 4]),
            'team_manager' => Role::create(['name' => 'team_manager', 'level' => 2]),
            'user' => Role::create(['name' => 'user', 'level' => 1]),
        ];

        RoleHierarchy::create(['role_id' => $roles['user']->id, 'next_approver_role_id' => $roles['team_manager']->id]);
        RoleHierarchy::create(['role_id' => $roles['team_manager']->id, 'next_approver_role_id' => $roles['manager']->id]);
        RoleHierarchy::create(['role_id' => $roles['manager']->id, 'next_approver_role_id' => $roles['gm']->id]);
        RoleHierarchy::create(['role_id' => $roles['gm']->id, 'next_approver_role_id' => null]);

        $this->gm = $this->createEmp('GM', $roles['gm'], $dept);
        $this->manager = $this->createEmp('Manager', $roles['manager'], $dept, $this->gm->id);
        $this->tm = $this->createEmp('Team Manager', $roles['team_manager'], $dept, $this->manager->id);
        $this->user1 = $this->createEmp('User 1', $roles['user'], $dept, $this->tm->id);
        $this->user2 = $this->createEmp('User 2', $roles['user'], $dept, $this->tm->id);
    }

    private function createEmp($name, $role, $dept, $supervisor_id = null)
    {
        $u = User::create(['name' => $name, 'email' => strtolower(str_replace(' ', '', $name)).'@test.com', 'password' => 'pass']);
        return Employee::create([
            'user_id' => $u->id,
            'role_id' => $role->id,
            'department_id' => $dept->id,
            'supervisor_id' => $supervisor_id,
            'nip' => 'NIP'.rand(1000,9999),
            'name' => $name,
        ]);
    }

    public function test_generate_chain_single_department()
    {
        $spd = Spd::create([
            'spd_number' => 'SPD-001', 'destination' => 'JKT', 'start_date' => '2026-01-01', 'end_date' => '2026-01-02', 'purpose' => 'Test',
            'is_cross_department' => false
        ]);

        SpdEmployee::create(['spd_id' => $spd->id, 'employee_id' => $this->user1->id]);
        SpdEmployee::create(['spd_id' => $spd->id, 'employee_id' => $this->tm->id]); // TM is highest

        $this->service->generateApprovalChain($spd);

        // Chain should start from TM's next approver (Manager -> GM)
        $chains = SpdApprovalChain::where('spd_id', $spd->id)->orderBy('level_order')->get();
        
        $this->assertCount(2, $chains);
        $this->assertEquals($this->manager->id, $chains[0]->approver_employee_id);
        $this->assertNull($chains[0]->spd_employee_id);
        $this->assertEquals($this->gm->id, $chains[1]->approver_employee_id);
    }

    public function test_generate_chain_cross_department()
    {
        $spd = Spd::create([
            'spd_number' => 'SPD-002', 'destination' => 'JKT', 'start_date' => '2026-01-01', 'end_date' => '2026-01-02', 'purpose' => 'Test',
            'is_cross_department' => true
        ]);

        $se1 = SpdEmployee::create(['spd_id' => $spd->id, 'employee_id' => $this->user1->id]); // User -> TM -> Manager -> GM
        $se2 = SpdEmployee::create(['spd_id' => $spd->id, 'employee_id' => $this->tm->id]); // TM -> Manager -> GM

        $this->service->generateApprovalChain($spd);

        $chainsUser1 = SpdApprovalChain::where('spd_employee_id', $se1->id)->orderBy('level_order')->get();
        $chainsTM = SpdApprovalChain::where('spd_employee_id', $se2->id)->orderBy('level_order')->get();
        
        $this->assertCount(3, $chainsUser1); // TM, Manager, GM
        $this->assertCount(2, $chainsTM);    // Manager, GM

        $this->assertEquals($this->tm->id, $chainsUser1[0]->approver_employee_id);
        $this->assertEquals($this->manager->id, $chainsTM[0]->approver_employee_id);
    }

    public function test_approve_reject_flow()
    {
        $spd = Spd::create([
            'spd_number' => 'SPD-003', 'destination' => 'JKT', 'start_date' => '2026-01-01', 'end_date' => '2026-01-02', 'purpose' => 'Test',
            'is_cross_department' => false
        ]);

        SpdEmployee::create(['spd_id' => $spd->id, 'employee_id' => $this->user1->id]);

        $this->service->generateApprovalChain($spd);

        $chain1 = SpdApprovalChain::where('spd_id', $spd->id)->where('level_order', 1)->first(); // TM
        
        $this->service->approve($chain1, $this->tm);
        $this->assertEquals('approved', $chain1->fresh()->status);
        $this->assertEquals('pending', $spd->fresh()->status);

        $chain2 = SpdApprovalChain::where('spd_id', $spd->id)->where('level_order', 2)->first(); // Manager
        $this->service->reject($chain2, $this->manager, 'Batal');
        
        $this->assertEquals('rejected', $chain2->fresh()->status);
        $this->assertEquals('rejected', $spd->fresh()->status);
        $this->assertEquals('cancelled', SpdApprovalChain::where('spd_id', $spd->id)->where('level_order', 3)->first()->status);
    }

    public function test_resolve_actual_approver_returns_original_when_no_delegation()
    {
        $approver = $this->gm;
        $resolved = $this->service->resolveActualApprover($approver);
        $this->assertEquals($approver->id, $resolved->id);
    }

    public function test_resolve_actual_approver_returns_delegate_when_active_delegation_exists()
    {
        $today = now()->toDateString();
        $start = now()->subDays(1)->toDateString();
        $end = now()->addDays(30)->toDateString();

        Delegation::create([
            'delegator_id' => $this->gm->id,
            'delegate_id' => $this->manager->id,
            'start_date' => $start,
            'end_date' => $end,
            'created_by' => $this->gm->id,
            'is_active' => true,
        ]);

        $resolved = $this->service->resolveActualApprover($this->gm);
        $this->assertEquals($this->manager->id, $resolved->id);
    }

    public function test_resolve_actual_approver_returns_original_when_delegation_inactive()
    {
        Delegation::create([
            'delegator_id' => $this->gm->id,
            'delegate_id' => $this->manager->id,
            'start_date' => now()->subDays(30)->toDateString(),
            'end_date' => now()->subDays(1)->toDateString(),
            'created_by' => $this->gm->id,
            'is_active' => true,
        ]);

        $resolved = $this->service->resolveActualApprover($this->gm);
        $this->assertEquals($this->gm->id, $resolved->id);
    }

    public function test_resolve_actual_approver_returns_original_when_delegation_outside_period()
    {
        Delegation::create([
            'delegator_id' => $this->gm->id,
            'delegate_id' => $this->manager->id,
            'start_date' => now()->addDays(10)->toDateString(),
            'end_date' => now()->addDays(40)->toDateString(),
            'created_by' => $this->gm->id,
            'is_active' => true,
        ]);

        $resolved = $this->service->resolveActualApprover($this->gm);
        $this->assertEquals($this->gm->id, $resolved->id);
    }

    public function test_delegation_cannot_overlap_for_same_delegator()
    {
        $start = now()->subDays(1)->toDateString();
        $end = now()->addDays(30)->toDateString();

        Delegation::create([
            'delegator_id' => $this->gm->id,
            'delegate_id' => $this->manager->id,
            'start_date' => $start,
            'end_date' => $end,
            'created_by' => $this->gm->id,
            'is_active' => true,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('overlapping');

        Delegation::create([
            'delegator_id' => $this->gm->id,
            'delegate_id' => $this->tm->id,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(10)->toDateString(),
            'created_by' => $this->gm->id,
            'is_active' => true,
        ]);
    }

    public function test_delegate_cannot_equal_delegator()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Delegate tidak boleh sama dengan delegator');

        Delegation::create([
            'delegator_id' => $this->gm->id,
            'delegate_id' => $this->gm->id,
            'start_date' => now()->subDays(1)->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'created_by' => $this->gm->id,
            'is_active' => true,
        ]);
    }
}