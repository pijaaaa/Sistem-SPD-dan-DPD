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
use Illuminate\Support\Facades\Hash;

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
        $this->dept = Department::create(['code' => 'IT', 'name' => 'IT']);

        $this->roles = [
            'gm' => Role::create(['name' => 'general_manager', 'level' => 5]),
            'manager' => Role::create(['name' => 'manager', 'level' => 4]),
            'team_manager' => Role::create(['name' => 'team_manager', 'level' => 2]),
            'user' => Role::create(['name' => 'user', 'level' => 1]),
        ];

        RoleHierarchy::create(['role_id' => $this->roles['user']->id, 'next_approver_role_id' => $this->roles['team_manager']->id]);
        RoleHierarchy::create(['role_id' => $this->roles['team_manager']->id, 'next_approver_role_id' => $this->roles['manager']->id]);
        RoleHierarchy::create(['role_id' => $this->roles['manager']->id, 'next_approver_role_id' => $this->roles['gm']->id]);
        RoleHierarchy::create(['role_id' => $this->roles['gm']->id, 'next_approver_role_id' => null]);

        $this->gm = $this->createEmp('GM', $this->roles['gm'], null);
        $this->manager = $this->createEmp('Manager', $this->roles['manager'], $this->dept->id);
        $this->tm = $this->createEmp('Team Manager', $this->roles['team_manager'], $this->dept->id);
        $this->user1 = $this->createEmp('User 1', $this->roles['user'], $this->dept->id);
        $this->user2 = $this->createEmp('User 2', $this->roles['user'], $this->dept->id);
    }

    private function createEmp($name, $role, $deptId)
    {
        $u = User::create(['name' => $name, 'email' => strtolower(str_replace(' ', '', $name)).'@test.com', 'password' => Hash::make('pass')]);
        return Employee::create([
            'user_id' => $u->id,
            'role_id' => $role->id,
            'department_id' => $deptId,
            'nip' => 'NIP'.rand(1000,9999),
            'name' => $name,
        ]);
    }

    public function test_generate_chain_for_user()
    {
        $spd = Spd::create([
            'spd_number' => 'SPD-001', 'destination' => 'JKT', 'start_date' => '2026-01-01', 'end_date' => '2026-01-02', 'purpose' => 'Test',
            'is_cross_department' => false,
            'main_department_id' => $this->dept->id,
        ]);

        $se = SpdEmployee::create(['spd_id' => $spd->id, 'employee_id' => $this->user1->id, 'is_primary' => true]);

        $this->service->generateApprovalChain($spd);

        $chains = SpdApprovalChain::where('spd_id', $spd->id)->orderBy('level_order')->get();

        $this->assertCount(2, $chains);
        $this->assertEquals($this->tm->id, $chains[0]->approver_employee_id);
        $this->assertEquals($this->manager->id, $chains[1]->approver_employee_id);
    }

    public function test_generate_chain_for_team_manager()
    {
        $spd = Spd::create([
            'spd_number' => 'SPD-002', 'destination' => 'JKT', 'start_date' => '2026-01-01', 'end_date' => '2026-01-02', 'purpose' => 'Test',
            'is_cross_department' => false,
            'main_department_id' => $this->dept->id,
        ]);

        $se = SpdEmployee::create(['spd_id' => $spd->id, 'employee_id' => $this->tm->id, 'is_primary' => true]);

        $this->service->generateApprovalChain($spd);

        $chains = SpdApprovalChain::where('spd_id', $spd->id)->orderBy('level_order')->get();

        $this->assertCount(1, $chains);
        $this->assertEquals($this->manager->id, $chains[0]->approver_employee_id);
    }

    public function test_generate_chain_for_manager()
    {
        $spd = Spd::create([
            'spd_number' => 'SPD-003', 'destination' => 'JKT', 'start_date' => '2026-01-01', 'end_date' => '2026-01-02', 'purpose' => 'Test',
            'is_cross_department' => false,
            'main_department_id' => $this->dept->id,
        ]);

        $se = SpdEmployee::create(['spd_id' => $spd->id, 'employee_id' => $this->manager->id, 'is_primary' => true]);

        $this->service->generateApprovalChain($spd);

        $chains = SpdApprovalChain::where('spd_id', $spd->id)->orderBy('level_order')->get();

        $this->assertCount(1, $chains);
        $this->assertEquals($this->gm->id, $chains[0]->approver_employee_id);
    }

    public function test_generate_chain_for_gm_auto_approved()
    {
        $spd = Spd::create([
            'spd_number' => 'SPD-004', 'destination' => 'JKT', 'start_date' => '2026-01-01', 'end_date' => '2026-01-02', 'purpose' => 'Test',
            'is_cross_department' => false,
            'main_department_id' => null,
        ]);

        $se = SpdEmployee::create(['spd_id' => $spd->id, 'employee_id' => $this->gm->id, 'is_primary' => true]);

        $this->service->generateApprovalChain($spd);

        $this->assertEquals('approved', $spd->fresh()->status);
        $this->assertEquals('approved', $se->fresh()->status);
        $this->assertEquals(0, SpdApprovalChain::where('spd_id', $spd->id)->count());
    }

    public function test_approve_reject_flow()
    {
        $spd = Spd::create([
            'spd_number' => 'SPD-005', 'destination' => 'JKT', 'start_date' => '2026-01-01', 'end_date' => '2026-01-02', 'purpose' => 'Test',
            'is_cross_department' => false,
            'main_department_id' => $this->dept->id,
        ]);

        SpdEmployee::create(['spd_id' => $spd->id, 'employee_id' => $this->user1->id, 'is_primary' => true]);

        $this->service->generateApprovalChain($spd);

        $chain1 = SpdApprovalChain::where('spd_id', $spd->id)->where('level_order', 1)->first();
        $this->service->approve($chain1, $this->tm);
        $this->assertEquals('approved', $chain1->fresh()->status);

        $chain2 = SpdApprovalChain::where('spd_id', $spd->id)->where('level_order', 2)->first();
        $this->service->reject($chain2, $this->manager, 'Batal');

        $this->assertEquals('rejected', $chain2->fresh()->status);
        $this->assertEquals('rejected', $spd->fresh()->status);
    }

    public function test_resolve_actual_approver_returns_original_when_no_delegation()
    {
        $approver = $this->gm;
        $resolved = $this->service->resolveActualApprover($approver);
        $this->assertEquals($approver->id, $resolved->id);
    }

    public function test_resolve_actual_approver_returns_delegate_when_active_delegation_exists()
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
}
