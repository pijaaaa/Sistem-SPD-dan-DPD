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
            'admin_departemen' => $this->adminDepartemenDashboard($employee),
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
                        'rejected' => Dpd::where('status', 'rejected')->count(),
                    ],
                ],
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
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->get();

            return [
                'role' => 'general_manager',
                'user_stats' => $userStats,
                'approvals' => $approvalStats,
                'delegations' => [
                    'active_count' => $delegations->count(),
                    'list' => $delegations->take(5)->values(),
                ],
            ];
        });
    }

    private function adminDepartemenDashboard(Employee $employee): array
    {
        $cacheKey = 'dashboard:admin:' . $employee->id;
        $ttl = 300;

        return Cache::remember($cacheKey, $ttl, function () use ($employee) {
            $userStats = $this->getUserStats($employee);
            $approvalStats = $this->getApprovalStats($employee);

            $spdMonthly = Spd::selectRaw('MONTH(created_at) as month, COUNT(*) as count')
                ->whereYear('created_at', now()->year)
                ->whereHas('employees', fn($q) => $q->where('employee_id', $employee->id))
                ->groupBy('month')
                ->pluck('count', 'month');

            $dpdMonthly = Dpd::selectRaw('MONTH(created_at) as month, COUNT(*) as count')
                ->whereYear('created_at', now()->year)
                ->where('employee_id', $employee->id)
                ->groupBy('month')
                ->pluck('count', 'month');

            $monthlyChart = [];
            for ($m = 1; $m <= 12; $m++) {
                $monthlyChart[] = [
                    'month' => $m,
                    'month_name' => date('M', mktime(0, 0, 0, $m, 1)),
                    'spd' => $spdMonthly->get($m, 0),
                    'dpd' => $dpdMonthly->get($m, 0),
                ];
            }

            return [
                'role' => 'admin_departemen',
                'user_stats' => $userStats,
                'approvals' => $approvalStats,
                'monthly_chart' => $monthlyChart,
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
                'rejected' => Dpd::whereIn('id', $dpdIds)->where('status', 'rejected')->count(),
            ],
        ];
    }

    private function getApprovalStats(Employee $employee): array
    {
        $today = now()->toDateString();

        $activeDelegators = Delegation::where('delegate_id', $employee->id)
            ->where('is_active', true)
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->pluck('delegator_id');

        $spdPending = SpdApprovalChain::where('status', 'pending')
            ->where(function ($q) use ($employee, $activeDelegators) {
                $q->where('approver_employee_id', $employee->id)
                  ->orWhereIn('approver_employee_id', $activeDelegators);
            })
            ->where('level_order', 1)
            ->orWhereDoesntHave('spd.approvalChains', function ($subQ) {
                $subQ->whereColumn('spd_approval_chains.spd_id', 'spd_id')
                     ->whereColumn('spd_approval_chains.level_order', '<', 'level_order')
                     ->where('status', '!=', 'approved');
            })
            ->count();

        $dpdPending = DpdApprovalChain::where('status', 'pending')
            ->where(function ($q) use ($employee, $activeDelegators) {
                $q->where('approver_employee_id', $employee->id)
                  ->orWhereIn('approver_employee_id', $activeDelegators);
            })
            ->where('level_order', 1)
            ->orWhereDoesntHave('dpd.approvalChains', function ($subQ) {
                $subQ->whereColumn('dpd_approval_chains.dpd_id', 'dpd_id')
                     ->whereColumn('dpd_approval_chains.level_order', '<', 'level_order')
                     ->where('status', '!=', 'approved');
            })
            ->count();

        return [
            'spd_pending' => $spdPending,
            'dpd_pending' => $dpdPending,
            'total_pending' => $spdPending + $dpdPending,
        ];
    }
}
