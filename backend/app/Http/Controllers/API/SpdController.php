<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Spd;
use App\Models\SpdEmployee;
use App\Models\Department;
use App\Http\Requests\StoreSpdRequest;
use App\Services\SpdNumberGeneratorService;
use App\Services\SpdApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SpdController extends Controller
{
    protected $numberGenerator;
    protected $approvalService;

    public function __construct(SpdNumberGeneratorService $numberGenerator, SpdApprovalService $approvalService)
    {
        $this->numberGenerator = $numberGenerator;
        $this->approvalService = $approvalService;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;

        $query = Spd::with(['department', 'employees.employee', 'dpd'])
            ->orderByDesc('created_at');

        // Filter berdasarkan status
        if ($request->has('status') && $request->status !== '' && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Non-super admin: hanya SPD yang melibatkan dirinya
        if ($employee && $employee->role->name !== 'super_admin') {
            $query->whereHas('employees', function ($q) use ($employee) {
                $q->where('employee_id', $employee->id);
            });
        }

        return response()->json($query->get());
    }

    public function store(StoreSpdRequest $request)
    {
        $validated = $request->validated();
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User tidak memiliki data employee.'], 403);
        }

        $allowedRoles = ['user', 'team_manager', 'manager'];
        if (!in_array($employee->role->name, $allowedRoles)) {
            return response()->json([
                'message' => 'Anda tidak memiliki izin untuk membuat SPD.'
            ], 403);
        }

        $spd = DB::transaction(function () use ($validated, $employee) {
            $isCrossDepartment = false;
            $departmentIds = [];
            $employeeIds = array_column($validated['employees'], 'employee_id');
            $employees = \App\Models\Employee::whereIn('id', $employeeIds)->get();
            foreach ($employees as $emp) {
                $departmentIds[] = $emp->department_id;
            }
            $isCrossDepartment = count(array_unique($departmentIds)) > 1;

            $spd = Spd::create([
                'destination' => $validated['destination'],
                'purpose' => $validated['purpose'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'status' => 'pending',
                'is_cross_department' => $isCrossDepartment,
                'main_department_id' => $employee->department_id ?? $validated['main_department_id'],
            ]);

            foreach ($validated['employees'] as $empData) {
                SpdEmployee::create([
                    'spd_id' => $spd->id,
                    'employee_id' => $empData['employee_id'],
                    'is_primary' => !empty($empData['is_primary']),
                    'status' => 'pending',
                ]);
            }

            $spd->refresh();

            $this->approvalService->generateApprovalChain($spd);

            return $spd;
        });

        return response()->json($spd->load(['department', 'employees.employee']), 201);
    }

    public function show(Spd $spd)
    {
        $spd->load([
            'department', 
            'employees.employee.user', 
            'employees.employee.role', 
            'approvalChains.approver.user', 
            'approvalChains.spdEmployee.employee.user', 
            'approvalChains.logs', 
            'dpd'
        ]);

        return response()->json($spd);
    }

    public function revise(Request $request, Spd $spd)
    {
        $user = $request->user();
        $employee = $user->employee;

        if ($employee && $employee->role->name !== 'super_admin') {
            $isPrimary = \App\Models\SpdEmployee::where('spd_id', $spd->id)
                ->where('employee_id', $employee->id)
                ->where('is_primary', true)
                ->exists();

            if (!$isPrimary) {
                return response()->json(['message' => 'Hanya pengaju utama yang dapat merevisi SPD.'], 403);
            }
        }

        if ($spd->status !== 'rejected') {
            return response()->json(['message' => 'Hanya SPD yang ditolak (rejected) yang bisa direvisi.'], 403);
        }

        DB::transaction(function () use ($spd) {
            // Hapus logs yang terkait dengan chains
            $chainIds = $spd->approvalChains()->pluck('id');
            \App\Models\ApprovalLog::where('approvable_type', \App\Models\SpdApprovalChain::class)
                ->whereIn('approvable_id', $chainIds)
                ->delete();

            // Hapus chains
            $spd->approvalChains()->delete();

            // Reset status peserta
            \App\Models\SpdEmployee::where('spd_id', $spd->id)->update(['status' => 'pending']);

            // Ubah status ke draft/pending lalu jalankan ulang generateApprovalChain
            $spd->update(['status' => 'pending']);

            app(\App\Services\SpdApprovalService::class)->generateApprovalChain($spd);
        });

        return response()->json(['message' => 'SPD berhasil diajukan ulang untuk revisi.']);
    }

    public function exportPdf(Spd $spd)
    {
        $user = request()->user();
        $employee = $user->employee;

        if ($employee && $employee->role->name !== 'super_admin') {
            $isParticipant = SpdEmployee::where('spd_id', $spd->id)
                ->where('employee_id', $employee->id)
                ->exists();

            if (!$isParticipant) {
                return response()->json(['message' => 'Anda tidak memiliki akses untuk mengunduh PDF ini.'], 403);
            }
        }

        $spd->load([
            'department',
            'employees.employee.user',
            'employees.employee.role',
            'approvalChains.approver.user',
            'approvalChains.logs',
        ]);

        $pdf = app('dompdf.wrapper');
        $html = $this->renderSpdHtml($spd);

        $filename = 'SPD_' . str_replace(['/', ' '], '_', $spd->spd_number) . '.pdf';

        return $pdf->loadHTML($html)->download($filename);
    }

    protected function renderSpdHtml(Spd $spd): string
    {
        $h = \App\Helpers\PdfHelper::class;

        $html = $h::htmlHead('Detail SPD');
        $html .= '<h1>Detail SPD ' . $h::escape($spd->spd_number) . '</h1>';

        $html .= '<div class="section">';
        $html .= '<div class="label">No. SPD:</div> ' . $h::escape($spd->spd_number) . '<br>';
        $html .= '<div class="label">Status:</div> ' . $h::statusBadge($spd->status) . '<br>';
        $html .= '<div class="label">Tujuan:</div> ' . $h::escape($spd->destination) . '<br>';
        $html .= '<div class="label">Keperluan:</div> ' . $h::escape($spd->purpose) . '<br>';
        $html .= '<div class="label">Periode:</div> ' . $h::formatDate($spd->start_date) . ' s/d ' . $h::formatDate($spd->end_date) . '<br>';
        $html .= '<div class="label">Departemen:</div> ' . $h::escape($spd->department?->code) . '<br>';
        $html .= '<div class="label">Lintas Departemen:</div> ' . ($spd->is_cross_department ? 'Ya' : 'Tidak') . '<br>';
        $html .= '</div>';

        $html .= '<div class="section"><h2>Peserta SPD</h2><table><thead><tr><th>Nama</th><th>Role</th><th>Departemen</th><th>Pemohon Utama</th></tr></thead><tbody>';
        foreach ($spd->employees as $se) {
            $html .= '<tr><td>' . $h::escape($se->employee?->user?->name ?? $se->employee?->name) . '</td>';
            $html .= '<td>' . $h::escape($se->employee?->role?->name) . '</td>';
            $html .= '<td>' . $h::escape($se->employee?->department?->code) . '</td>';
            $html .= '<td>' . ($se->is_primary ? 'Ya' : 'Tidak') . '</td></tr>';
        }
        $html .= '</tbody></table></div>';

        if (!empty($spd->approvalChains)) {
            $html .= '<div class="section"><h2>Riwayat Persetujuan</h2><table><thead><tr><th>Level</th><th>Nama</th><th>Status</th><th>Tanggal</th><th>Alasan Penolakan</th></tr></thead><tbody>';
            foreach ($spd->approvalChains as $chain) {
                $html .= '<tr>';
                $html .= '<td>' . $chain->level_order . '</td>';
                $html .= '<td>' . $h::escape($chain->approver?->user?->name ?? $chain->approver?->name ?? '-') . '</td>';
                $html .= '<td>' . $h::statusBadge($chain->status) . '</td>';
                $approveLog = $chain->logs ? $chain->logs->firstWhere('action', 'approved') : null;
                $rejectLog = $chain->logs ? $chain->logs->firstWhere('action', 'rejected') : null;
                $log = $rejectLog ?? $approveLog;
                $html .= '<td>' . ($log ? $h::formatDate($log->created_at) : '-') . '</td>';
                $html .= '<td>' . ($rejectLog ? $h::escape($rejectLog->rejection_reason) : '-') . '</td>';
                $html .= '</tr>';
            }
            $html .= '</tbody></table></div>';
        }

        $html .= '</body></html>';

        return $html;
    }
}