<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Department;
use App\Models\Spd;
use App\Models\Dpd;
use App\Models\SpdApprovalChain;
use App\Models\DpdApprovalChain;
use App\Models\Delegation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User tidak memiliki data employee.'], 403);
        }

        $roleName = $employee->role->name;

        return match ($roleName) {
            'super_admin' => $this->superAdminDashboard(),
            'general_manager' => $this->generalManagerDashboard($employee),
            default => $this->userDashboard($employee),
        };
    }

    private function superAdminDashboard(): array
    {
        $cacheKey = 'dashboard:super_admin';
        $ttl = 300;

        return Cache::remember($cacheKey, $ttl, function () {
            return [
                'role' => 'super_admin',
                'totals' => [
                    'employees' => Employee::count(),
                    'departments' => Department::count(),
                    'spd' => [
                        'total' => Spd::count(),
                        'pending' => Spd::where('status', 'pending')->count(),
                        'approved' => Spd::where('status', 'approved')->count(),
                        'rejected' => Spd::where('status', 'rejected')->count(),
                    ],
                     'dpd' => [
                        'total' => Dpd::count(),
                        'pending' => Dpd::whereIn('status', ['draft', 'submitted'])->count(),
                        'approved' => Dpd::where('status', 'approved')->count(),
                        'revisi' => Dpd::where('status', 'revisi')->count(),
                    ],
                ],
                'monthly_stats' => $this->getMonthlyStats(),
                'department_stats' => $this->getDepartmentStats(),
                'recent_activities' => $this->getRecentActivities(),
            ];
        });
    }

    private function generalManagerDashboard(Employee $employee): array
    {
        $cacheKey = 'dashboard:gm:' . $employee->id;
        $ttl = 300;

        return Cache::remember($cacheKey, $ttl, function () use ($employee) {
            $userStats = $this->getUserStats($employee);
            $approvalStats = $this->getApprovalStats($employee);
            $delegations = Delegation::with(['delegator.user', 'delegate.user'])
                ->where('is_active', true)
                ->whereDate('start_date', '<=', now())
                ->whereDate('end_date', '>=', now())
                ->get();

            return [
                'role' => 'general_manager',
                'user_stats' => $userStats,
                'approvals' => $approvalStats,
                'delegations' => [
                    'active_count' => $delegations->count(),
                    'list' => $delegations->take(5)->values(),
                ],
                'monthly_stats' => $this->getMonthlyStats(),
                'department_stats' => $this->getDepartmentStats(),
            ];
        });
    }

    private function userDashboard(Employee $employee): array
    {
        $cacheKey = 'dashboard:user:' . $employee->id;
        $ttl = 300;

        return Cache::remember($cacheKey, $ttl, function () use ($employee) {
            $userStats = $this->getUserStats($employee);
            $approvalStats = $this->getApprovalStats($employee);

            return [
                'role' => $employee->role->name,
                'user_stats' => $userStats,
                'approvals' => $approvalStats,
                'monthly_stats' => $this->getUserMonthlyStats($employee),
            ];
        });
    }

    private function getUserStats(Employee $employee): array
    {
        $spdIds = \DB::table('spd_employees')
            ->where('employee_id', $employee->id)
            ->pluck('spd_id');

        $dpdIds = Dpd::where('employee_id', $employee->id)->pluck('id');

        return [
            'spd' => [
                'total' => $spdIds->count(),
                'pending' => Spd::whereIn('id', $spdIds)->where('status', 'pending')->count(),
                'approved' => Spd::whereIn('id', $spdIds)->where('status', 'approved')->count(),
                'rejected' => Spd::whereIn('id', $spdIds)->where('status', 'rejected')->count(),
            ],
            'dpd' => [
                'total' => $dpdIds->count(),
                'pending' => Dpd::whereIn('id', $dpdIds)->whereIn('status', ['draft', 'submitted'])->count(),
                'approved' => Dpd::whereIn('id', $dpdIds)->where('status', 'approved')->count(),
                'revisi' => Dpd::whereIn('id', $dpdIds)->where('status', 'revisi')->count(),
            ],
        ];
    }

    private function getApprovalStats(Employee $employee): array
    {
        $today = now()->toDateString();

        $activeDelegators = Delegation::where('delegate_id', $employee->id)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->pluck('delegator_id');

        $approverIds = $activeDelegators->push($employee->id);

        $spdPending = SpdApprovalChain::where('status', 'pending')
            ->whereIn('approver_employee_id', $approverIds)
            ->whereNotExists(function ($subQ) {
                $subQ->selectRaw(1)
                    ->from('spd_approval_chains as sac2')
                    ->whereColumn('sac2.spd_id', 'spd_approval_chains.spd_id')
                    ->whereColumn('sac2.spd_employee_id', 'spd_approval_chains.spd_employee_id')
                    ->whereColumn('sac2.level_order', '<', 'spd_approval_chains.level_order')
                    ->where('sac2.status', '!=', 'approved');
            })
            ->count();

        $dpdPending = DpdApprovalChain::where('status', 'pending')
            ->whereIn('approver_employee_id', $approverIds)
            ->whereNotExists(function ($subQ) {
                $subQ->selectRaw(1)
                    ->from('dpd_approval_chains as dac2')
                    ->whereColumn('dac2.dpd_id', 'dpd_approval_chains.dpd_id')
                    ->whereColumn('dac2.level_order', '<', 'dpd_approval_chains.level_order')
                    ->where('dac2.status', '!=', 'approved');
            })
            ->count();

        return [
            'spd_pending' => $spdPending,
            'dpd_pending' => $dpdPending,
            'total_pending' => $spdPending + $dpdPending,
        ];
    }

    private function getMonthlyStats(): array
    {
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthStart = $date->copy()->startOfMonth();
            $monthEnd = $date->copy()->endOfMonth();

            $months[] = [
                'month' => $date->format('M'),
                'month_full' => $date->format('F Y'),
                'spd' => Spd::whereBetween('created_at', [$monthStart, $monthEnd])->count(),
                'dpd' => Dpd::whereBetween('created_at', [$monthStart, $monthEnd])->count(),
            ];
        }
        return $months;
    }

    private function getUserMonthlyStats(Employee $employee): array
    {
        $spdIds = \DB::table('spd_employees')
            ->where('employee_id', $employee->id)
            ->pluck('spd_id');

        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthStart = $date->copy()->startOfMonth();
            $monthEnd = $date->copy()->endOfMonth();

            $months[] = [
                'month' => $date->format('M'),
                'month_full' => $date->format('F Y'),
                'spd' => Spd::whereIn('id', $spdIds)->whereBetween('created_at', [$monthStart, $monthEnd])->count(),
                'dpd' => Dpd::where('employee_id', $employee->id)->whereBetween('created_at', [$monthStart, $monthEnd])->count(),
            ];
        }
        return $months;
    }

    private function getDepartmentStats(): array
    {
        $departments = Department::withCount(['employees'])->get();
        
        return $departments->map(function ($dept) {
            $employeeIds = $dept->employees->pluck('id');
            
            $spdIds = \DB::table('spd_employees')
                ->whereIn('employee_id', $employeeIds)
                ->pluck('spd_id')
                ->unique();

            return [
                'name' => $dept->name,
                'employees' => $dept->employees_count,
                'spd' => Spd::whereIn('id', $spdIds)->count(),
                'dpd' => Dpd::whereIn('employee_id', $employeeIds)->count(),
            ];
        })->toArray();
    }

    private function getRecentActivities(): array
    {
        $recentSpd = Spd::with(['employees.employee.user'])
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($spd) {
                return [
                    'type' => 'SPD',
                    'title' => $spd->title ?? $spd->destination ?? 'SPD',
                    'status' => $spd->status,
                    'created_at' => $spd->created_at->diffForHumans(),
                    'employee' => $spd->employees->first()?->employee?->user?->name ?? '-',
                ];
            });

        $recentDpd = Dpd::with(['employee.user', 'spd'])
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($dpd) {
                return [
                    'type' => 'DPD',
                    'title' => 'DPD - ' . ($dpd->spd->destination ?? 'N/A'),
                    'status' => $dpd->status,
                    'created_at' => $dpd->created_at->diffForHumans(),
                    'employee' => $dpd->employee->user->name ?? '-',
                ];
            });

        return $recentSpd->concat($recentDpd)
            ->sortByDesc('created_at')
            ->take(10)
            ->values()
            ->toArray();
    }
}
