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
use Dompdf\Dompdf;
use Dompdf\Options;

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
                'main_department_id' => $employee->department_id ?? $validated['main_department_id'] ?? null,
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
        $this->authorize('view', $spd);
        
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

        $html = $this->renderSpdHtml($spd);
        
        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isPhpEnabled', true);
        $options->set('isRemoteEnabled', true);
        
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $filename = 'SPD_' . str_replace(['/', ' '], '_', $spd->spd_number) . '.pdf';

        return response()->streamDownload(function() use ($dompdf) {
            echo $dompdf->output();
        }, $filename, ['Content-Type' => 'application/pdf']);
    }

    protected function renderSpdHtml(Spd $spd): string
    {
        $h = \App\Helpers\PdfHelper::class;

        $html = $h::htmlHead('Detail SPD - ' . $spd->spd_number, 'SPD');
        $html .= $h::watermark($spd->status);
        $html .= $h::header('SPD');
        
        $html .= '<div class="doc-title">SURAT PERJALANAN DINAS (SPD)</div>';

        // Informasi SPD - Status dihapus
        $html .= '<div class="section">';
        $html .= '<div class="section-title">Informasi SPD</div>';
        $html .= '<div class="info-row"><div class="info-label">No. SPD:</div><div class="info-value">' . $h::escape($spd->spd_number) . '</div></div>';
        $html .= '<div class="info-row"><div class="info-label">Tujuan:</div><div class="info-value">' . $h::escape($spd->destination) . '</div></div>';
        $html .= '<div class="info-row"><div class="info-label">Keperluan:</div><div class="info-value">' . $h::escape($spd->purpose) . '</div></div>';
        $html .= '<div class="info-row"><div class="info-label">Periode:</div><div class="info-value">' . $h::formatDate($spd->start_date) . ' s/d ' . $h::formatDate($spd->end_date) . '</div></div>';
        $html .= '<div class="info-row"><div class="info-label">Departemen:</div><div class="info-value">' . $h::escape($spd->department?->name ?? '-') . ' (' . $h::escape($spd->department?->code ?? '-') . ')</div></div>';
        $html .= '<div class="info-row"><div class="info-label">Lintas Departemen:</div><div class="info-value">' . ($spd->is_cross_department ? 'Ya' : 'Tidak') . '</div></div>';
        $html .= '</div>';

        // Pemohon Utama dan Pengikut - Pisah section
        $primary = null;
        $followers = [];
        
        foreach ($spd->employees as $se) {
            if ($se->is_primary) {
                $primary = $se;
            } else {
                $followers[] = $se;
            }
        }

        if ($primary) {
            $html .= '<div class="section">';
            $html .= '<div class="section-title">Pemohon Utama</div>';
            $html .= '<div class="info-row"><div class="info-label">Nama:</div><div class="info-value">' . $h::escape($primary->employee?->user?->name ?? $primary->employee?->name ?? '-') . '</div></div>';
            $html .= '<div class="info-row"><div class="info-label">Departemen:</div><div class="info-value">' . $h::escape($primary->employee?->department?->name ?? '-') . '</div></div>';
            $html .= '</div>';
        }

        if (!empty($followers)) {
            $html .= '<div class="section">';
            $html .= '<div class="section-title">Pengikut Perjalanan Dinas</div>';
            $html .= '<table><thead><tr><th>Nama</th><th>Departemen</th></tr></thead><tbody>';
            foreach ($followers as $se) {
                $html .= '<tr>';
                $html .= '<td>' . $h::escape($se->employee?->user?->name ?? $se->employee?->name ?? '-') . '</td>';
                $html .= '<td>' . $h::escape($se->employee?->department?->name ?? '-') . '</td>';
                $html .= '</tr>';
            }
            $html .= '</tbody></table>';
            $html .= '</div>';
        }

        // Riwayat persetujuan dihapus
        // Signature dengan logika kondisional berdasarkan level
        if ($primary) {
            $requesterName = $primary->employee?->user?->name ?? $primary->employee?->name ?? 'Pemohon';
            $requesterDept = $primary->employee?->department?->name ?? 'Departemen';
            $requesterRoleName = $primary->employee?->role?->name ?? 'user';
            $requesterDeptId = $primary->employee?->department_id ?? 0;
            
            $html .= $h::signatureBoxesSpd($requesterName, $requesterDept, $requesterRoleName, $requesterDeptId);
        }

        $html .= $h::footer();
        $html .= '</body></html>';

        return $html;
    }
}