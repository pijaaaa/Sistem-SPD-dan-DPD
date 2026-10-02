<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Dpd;
use App\Models\Employee;
use App\Models\Role;
use App\Models\Spd;
use App\Models\SpdEmployee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SpdAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private $dept;
    private $userRole;
    private $adminRole;
    private $participant;
    private $participantUser;
    private $stranger;
    private $strangerUser;
    private $admin;
    private $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dept = Department::create(['code' => 'IT', 'name' => 'IT']);
        $this->userRole = Role::create(['name' => 'user', 'level' => 1]);
        $this->adminRole = Role::create(['name' => 'super_admin', 'level' => 9]);

        $p = User::create(['name' => 'Peserta', 'email' => 'peserta@t.com', 'password' => Hash::make('pw')]);
        $this->participantUser = $p;
        $this->participant = Employee::create([
            'user_id' => $p->id, 'role_id' => $this->userRole->id,
            'department_id' => $this->dept->id, 'nip' => 'NIP-P', 'no_pekerja' => 'EMP-P', 'name' => 'Peserta',
        ]);

        $s = User::create(['name' => 'Asing', 'email' => 'asing@t.com', 'password' => Hash::make('pw')]);
        $this->strangerUser = $s;
        $this->stranger = Employee::create([
            'user_id' => $s->id, 'role_id' => $this->userRole->id,
            'department_id' => $this->dept->id, 'nip' => 'NIP-S', 'no_pekerja' => 'EMP-S', 'name' => 'Asing',
        ]);

        $a = User::create(['name' => 'Admin', 'email' => 'admin@t.com', 'password' => Hash::make('pw')]);
        $this->adminUser = $a;
        $this->admin = Employee::create([
            'user_id' => $a->id, 'role_id' => $this->adminRole->id,
            'department_id' => $this->dept->id, 'nip' => 'NIP-A', 'no_pekerja' => 'EMP-A', 'name' => 'Admin',
        ]);
    }

    private function makeSpd(): Spd
    {
        $spd = Spd::create([
            'spd_number' => 'SPD-AUTH-001',
            'destination' => 'Jakarta',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-03',
            'purpose' => 'Rapat',
            'status' => 'pending',
            'is_cross_department' => false,
            'main_department_id' => $this->dept->id,
        ]);

        SpdEmployee::create([
            'spd_id' => $spd->id,
            'employee_id' => $this->participant->id,
            'is_primary' => true,
            'status' => 'pending',
        ]);

        return $spd;
    }

    public function test_participant_can_view_spd(): void
    {
        $spd = $this->makeSpd();

        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->participantUser)
            ->getJson("/api/spd/{$spd->id}")
            ->assertOk()
            ->assertJsonPath('spd_number', 'SPD-AUTH-001');
    }

    public function test_non_participant_is_forbidden(): void
    {
        $spd = $this->makeSpd();

        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->strangerUser)
            ->getJson("/api/spd/{$spd->id}")
            ->assertForbidden();
    }

    public function test_super_admin_can_view_any_spd(): void
    {
        $spd = $this->makeSpd();

        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->adminUser)
            ->getJson("/api/spd/{$spd->id}")
            ->assertOk();
    }

    public function test_guest_cannot_view_spd(): void
    {
        $spd = $this->makeSpd();

        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->getJson("/api/spd/{$spd->id}")
            ->assertUnauthorized();
    }

    public function test_download_file_rejects_path_traversal(): void
    {
        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->adminUser)
            ->getJson('/api/dpd/download-file?path=' . urlencode('../../../.env'))
            ->assertStatus(400);
    }

    public function test_download_file_requires_auth(): void
    {
        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->getJson('/api/dpd/download-file?path=dpd_reports/x.pdf')
            ->assertUnauthorized();
    }

    private function makeDpd(Spd $spd, Employee $creator): Dpd
    {
        $dpd = Dpd::create([
            'spd_id' => $spd->id,
            'dpd_number' => 'DPD-AUTH-001',
            'employee_id' => $creator->id,
            'submission_date' => '2026-06-04',
            'total_nominal' => 100000,
            'status' => 'draft',
        ]);

        return $dpd;
    }

    public function test_dpd_creator_can_view_dpd(): void
    {
        $spd = $this->makeSpd();
        $dpd = $this->makeDpd($spd, $this->participant);

        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->participantUser)
            ->getJson("/api/dpd/{$dpd->id}")
            ->assertOk()
            ->assertJsonPath('dpd.dpd_number', 'DPD-AUTH-001');
    }

    public function test_dpd_non_participant_is_forbidden(): void
    {
        $spd = $this->makeSpd();
        $dpd = $this->makeDpd($spd, $this->participant);

        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->strangerUser)
            ->getJson("/api/dpd/{$dpd->id}")
            ->assertForbidden();
    }

    public function test_dpd_spd_participant_can_view_dpd(): void
    {
        $spd = $this->makeSpd();
        $dpd = $this->makeDpd($spd, $this->participant);

        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->participantUser)
            ->getJson("/api/dpd/{$dpd->id}")
            ->assertOk();
    }

    public function test_dpd_super_admin_can_view_any_dpd(): void
    {
        $spd = $this->makeSpd();
        $dpd = $this->makeDpd($spd, $this->participant);

        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->actingAs($this->adminUser)
            ->getJson("/api/dpd/{$dpd->id}")
            ->assertOk();
    }

    public function test_dpd_guest_cannot_view_dpd(): void
    {
        $spd = $this->makeSpd();
        $dpd = $this->makeDpd($spd, $this->participant);

        $this->withSession([])
            ->withHeaders(['referer' => 'http://127.0.0.1:8000'])
            ->getJson("/api/dpd/{$dpd->id}")
            ->assertUnauthorized();
    }
}