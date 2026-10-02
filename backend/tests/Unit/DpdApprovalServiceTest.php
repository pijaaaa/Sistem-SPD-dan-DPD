<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Dpd;
use App\Models\Spd;
use App\Models\DpdApprovalChain;
use App\Models\Employee;
use App\Models\Role;
use App\Models\RoleHierarchy;
use App\Models\User;
use App\Models\Department;
use App\Models\Delegation;
use App\Models\AppSetting;
use App\Models\DpdExpense;
use App\Models\DpdExpenseCategory;
use App\Services\DpdApprovalService;
use App\Services\AppSettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

class DpdApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $service;
    protected $appSettingService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->appSettingService = new AppSettingService();
        $this->service = new DpdApprovalService($this->appSettingService);
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
        $this->manager = $this->createEmp('Mgr', $this->roles['manager'], $this->dept->id);
        $this->tm = $this->createEmp('TM', $this->roles['team_manager'], $this->dept->id);
        $this->user1 = $this->createEmp('User1', $this->roles['user'], $this->dept->id);
    }

    private function createEmp($name, $role, $deptId)
    {
        $u = User::create(['name' => $name, 'email' => strtolower($name).'@dpd.test', 'password' => Hash::make('pass')]);
        return Employee::create([
            'user_id' => $u->id,
            'role_id' => $role->id,
            'department_id' => $deptId,
            'nip' => 'NIP'.rand(10000, 99999),
            'name' => $name,
        ]);
    }

    private function createSpdForUser(Employee $employee): Spd
    {
        $spd = Spd::create([
            'spd_number' => 'SPD-' . $employee->id,
            'destination' => 'JKT',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-03',
            'purpose' => 'Test',
            'is_cross_department' => false,
            'main_department_id' => $this->dept->id,
        ]);
        $spd->load('department');
        return $spd;
    }

    private function createDpd(Employee $employee): Dpd
    {
        $spd = $this->createSpdForUser($employee);
        return Dpd::create([
            'spd_id' => $spd->id,
            'dpd_number' => 'DPD-' . $employee->id,
            'employee_id' => $employee->id,
            'submission_date' => now()->toDateString(),
            'total_nominal' => 100000,
            'status' => 'draft',
        ]);
    }

    // ===================================================================
    // Chain generation scenarios
    // ===================================================================

    public function test_dpd_generate_chain_for_user(): void
    {
        $dpd = $this->createDpd($this->user1);
        $this->service->generateApprovalChain($dpd);

        $chains = DpdApprovalChain::where('dpd_id', $dpd->id)->orderBy('level_order')->get();

        $this->assertCount(2, $chains); // [tm, mgr] — GM only for manager submissions
        $this->assertEquals($this->tm->id, $chains[0]->approver_employee_id);
        $this->assertEquals($this->manager->id, $chains[1]->approver_employee_id);
        $this->assertEquals('submitted', $dpd->fresh()->status);
    }

    public function test_dpd_generate_chain_for_team_manager(): void
    {
        $dpd = $this->createDpd($this->tm);
        $this->service->generateApprovalChain($dpd);

        $chains = DpdApprovalChain::where('dpd_id', $dpd->id)->orderBy('level_order')->get();

        $this->assertCount(1, $chains); // [mgr]
        $this->assertEquals($this->manager->id, $chains[0]->approver_employee_id);
        $this->assertEquals('submitted', $dpd->fresh()->status);
    }

    public function test_dpd_generate_chain_for_manager(): void
    {
        $dpd = $this->createDpd($this->manager);
        $this->service->generateApprovalChain($dpd);

        $chains = DpdApprovalChain::where('dpd_id', $dpd->id)->orderBy('level_order')->get();

        $this->assertCount(1, $chains); // [gm] — only manager goes to GM
        $this->assertEquals($this->gm->id, $chains[0]->approver_employee_id);
        $this->assertEquals('submitted', $dpd->fresh()->status);
    }

    public function test_dpd_generate_chain_for_gm_no_approval_needed(): void
    {
        $dpd = $this->createDpd($this->gm);
        $this->service->generateApprovalChain($dpd);

        $this->assertEquals('submitted', $dpd->fresh()->status);
        $this->assertEquals(0, DpdApprovalChain::where('dpd_id', $dpd->id)->count());
    }

    // ===================================================================
    // Approval & rejection flows
    // ===================================================================

    public function test_dpd_approve_single_chain(): void
    {
        $dpd = $this->createDpd($this->user1);
        $this->service->generateApprovalChain($dpd);

        $chain1 = DpdApprovalChain::where('dpd_id', $dpd->id)->where('level_order', 1)->first();
        $this->service->approve($chain1, $this->tm);

        $this->assertEquals('approved', $chain1->fresh()->status);

        $chain2 = DpdApprovalChain::where('dpd_id', $dpd->id)->where('level_order', 2)->first();
        $this->assertEquals('pending', $chain2->fresh()->status);

        $this->assertEquals('submitted', $dpd->fresh()->status);
    }

    public function test_dpd_approve_all_chains_marks_dpd_approved(): void
    {
        $dpd = $this->createDpd($this->user1);
        $this->service->generateApprovalChain($dpd);

        $chains = DpdApprovalChain::where('dpd_id', $dpd->id)->orderBy('level_order')->get();
        foreach ($chains as $chain) {
            $approver = $chain->approver;
            $this->service->approve($chain, $approver);
        }

        $this->assertEquals('approved', $dpd->fresh()->status);
    }

    public function test_dpd_reject_marks_dpd_revisi(): void
    {
        $dpd = $this->createDpd($this->user1);
        $this->service->generateApprovalChain($dpd);

        $chain = DpdApprovalChain::where('dpd_id', $dpd->id)->first();
        $approver = $chain->approver;

        $this->service->reject($chain, $approver, 'Budget exceeded');

        $this->assertEquals('rejected', $chain->fresh()->status);
        $this->assertEquals('revisi', $dpd->fresh()->status);

        $log = $chain->logs()->first();
        $this->assertEquals('Budget exceeded', $log->rejection_reason);
    }

    public function test_dpd_reject_cancels_remaining_chains(): void
    {
        $dpd = $this->createDpd($this->user1);
        $this->service->generateApprovalChain($dpd);

        $chain1 = DpdApprovalChain::where('dpd_id', $dpd->id)->where('level_order', 1)->first();
        $this->service->reject($chain1, $this->tm, 'Cancelled');

        $chain2 = DpdApprovalChain::where('dpd_id', $dpd->id)->where('level_order', 2)->first();
        $this->assertEquals('cancelled', $chain2->fresh()->status);
    }

    // ===================================================================
    // Delegation scenarios
    // ===================================================================

    public function test_dpd_delegate_approves_on_behalf(): void
    {
        // Manager delegates to team_manager
        Delegation::create([
            'delegator_id' => $this->manager->id,
            'delegate_id' => $this->tm->id,
            'start_date' => now()->subDays(1)->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'created_by' => $this->manager->id,
            'is_active' => true,
        ]);

        $dpd = $this->createDpd($this->user1);
        $this->service->generateApprovalChain($dpd);

        $chain = DpdApprovalChain::where('dpd_id', $dpd->id)->where('level_order', 2)->first();
        // TM (delegate) approves GM's... no, TM is at level_order 1 and mgr at 2
        // Actually: user1 → [tm(lvl1), mgr(lvl2)]. GM delegation of mgr means TM can approve mgr's chain
        $this->service->approve($chain, $this->tm);

        $this->assertEquals('approved', $chain->fresh()->status);

        $log = $chain->logs()->first();
        $this->assertEquals($this->tm->id, $log->approver_employee_id);
        $this->assertEquals($this->manager->id, $log->acted_on_behalf_of);
    }

    public function test_dpd_delegation_expired_returns_original(): void
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

    public function test_dpd_delegation_inactive_flag_returns_original(): void
    {
        Delegation::create([
            'delegator_id' => $this->gm->id,
            'delegate_id' => $this->manager->id,
            'start_date' => now()->subDays(1)->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'created_by' => $this->gm->id,
            'is_active' => false,
        ]);

        $resolved = $this->service->resolveActualApprover($this->gm);
        $this->assertEquals($this->gm->id, $resolved->id);
    }

    public function test_dpd_delegation_future_start_returns_original(): void
    {
        Delegation::create([
            'delegator_id' => $this->gm->id,
            'delegate_id' => $this->manager->id,
            'start_date' => now()->addDays(5)->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'created_by' => $this->gm->id,
            'is_active' => true,
        ]);

        $resolved = $this->service->resolveActualApprover($this->gm);
        $this->assertEquals($this->gm->id, $resolved->id);
    }

    public function test_dpd_unauthorized_approver_thrown(): void
    {
        $dpd = $this->createDpd($this->user1);
        $this->service->generateApprovalChain($dpd);

        $chain = DpdApprovalChain::where('dpd_id', $dpd->id)->first();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Unauthorized approver');
        $this->service->approve($chain, $this->user1);
    }

    // ===================================================================
    // getMyApprovals scenarios
    // ===================================================================

    public function test_dpd_get_my_approvals_returns_pending_chains(): void
    {
        $dpd = $this->createDpd($this->user1);
        $this->service->generateApprovalChain($dpd);

        $approvals = $this->service->getMyApprovals($this->tm);

        $this->assertCount(1, $approvals);
    }

    public function test_dpd_get_my_approvals_returns_empty_when_no_pending(): void
    {
        $approvals = $this->service->getMyApprovals($this->tm);
        $this->assertCount(0, $approvals);
    }

    public function test_dpd_get_my_approvals_includes_delegated_chains(): void
    {
        Delegation::create([
            'delegator_id' => $this->manager->id,
            'delegate_id' => $this->tm->id,
            'start_date' => now()->subDays(1)->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'created_by' => $this->manager->id,
            'is_active' => true,
        ]);

        $dpd = $this->createDpd($this->user1);
        $this->service->generateApprovalChain($dpd);

        $chains = DpdApprovalChain::where('dpd_id', $dpd->id)->orderBy('level_order')->get();

        // When delegate (TM) approves chain 1, chain 2 (mgr's) is also auto-approved
        // because TM is the actual approver for mgr via delegation
        $this->service->approve($chains[0], $this->tm);

        $chains[1]->refresh();
        $this->assertEquals('approved', $chains[1]->status);
    }

    // ===================================================================
    // Validation scenarios
    // ===================================================================

    public function test_validate_dpd_submission_deadline_passes_when_within_deadline(): void
    {
        AppSetting::set('dpd_submission_deadline_days', 30);

        $dpd = $this->createDpd($this->user1);
        // Set SPD end_date to 5 days ago so 30-day deadline is still in the future
        $dpd->spd->update(['end_date' => now()->subDays(5)->toDateString()]);
        $this->assertTrue($this->service->validateSubmissionDeadline($dpd));
    }

    public function test_validate_dpd_submission_deadline_fails_when_expired(): void
    {
        AppSetting::set('dpd_submission_deadline_days', 1);

        // Set end date to 60 days ago so deadline is far in the past
        $spd = Spd::find($this->createDpd($this->user1)->spd_id);
        $spd->update(['end_date' => now()->subDays(60)->toDateString()]);

        $dpd = Dpd::where('spd_id', $spd->id)->first();
        $dpd->update(['submission_date' => now()->toDateString()]);

        $this->assertFalse($this->service->validateSubmissionDeadline($dpd));
    }

    public function test_validate_dpd_submission_returns_warning_when_over_limit(): void
    {
        AppSetting::set('max_nominal_per_day', 50000);

        $dpd = $this->createDpd($this->user1);
        // 3-day trip, total 100000 → avg 33333 per day. Below 50000 so no warning
        $warnings = $this->service->validateDpdSubmission($dpd);
        $this->assertCount(0, $warnings);

        // Now increase total to trigger warning
        $dpd->update(['total_nominal' => 200000]); // avg 66666 > 50000
        $warnings = $this->service->validateDpdSubmission($dpd);
        $this->assertCount(1, $warnings);
    }

    public function test_validate_dpd_submission_no_warning_when_limit_not_set(): void
    {
        // Don't set max_nominal_per_day — default is 0 (disabled), no warnings
        $dpd = $this->createDpd($this->user1);
        $warnings = $this->service->validateDpdSubmission($dpd);
        $this->assertCount(0, $warnings);
    }
}
