<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Dpd;
use App\Models\DpdReport;
use App\Models\DpdExpense;
use App\Models\DpdExpenseCategory;
use App\Models\Spd;
use App\Models\SpdEmployee;
use App\Models\Employee;
use App\Services\AppSettingService;
use App\Services\DpdApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Dompdf\Dompdf;
use Dompdf\Options;

class DpdController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;

        $query = Dpd::with(['spd', 'employee.user', 'reports', 'expenses.category']);

        if ($employee && $employee->role->name !== 'super_admin') {
            $query->where(function ($q) use ($employee) {
                $q->where('employee_id', $employee->id)
                  ->orWhereHas('spd.employees', function ($sq) use ($employee) {
                      $sq->where('employee_id', $employee->id);
                  });
            });
        }

        $dpds = $query->orderBy('created_at', 'desc')->get();

        return response()->json($dpds);
    }

    public function show(Dpd $dpd)
    {
        $dpd->load([
            'spd.employees.employee', 
            'employee.user', 
            'reports', 
            'expenses.category',
            'approvalChains.approver.user',
            'approvalChains.logs'
        ]);

        $spd = $dpd->spd;
        $tripDays = $spd ? $spd->start_date->diffInDays($spd->end_date) + 1 : 0;

        return response()->json([
            'dpd' => $dpd,
            'trip_days' => $tripDays,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'spd_id' => 'required|exists:spds,id',
            'submission_date' => 'required|date',
            'reports' => 'nullable|array',
            'reports.*.title' => 'required_with:reports|string',
            'reports.*.description' => 'nullable|string',
            'reports.*.attachments' => 'nullable|array',
            'reports.*.attachments.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240',
            'expenses' => 'required|array|min:1',
            'expenses.*.category_id' => 'required|exists:dpd_expense_categories,id',
            'expenses.*.description' => 'required|string',
            'expenses.*.amount' => 'required|numeric|min:0',
            'expenses.*.expense_date' => 'required|date',
            'expenses.*.attachments' => 'nullable|array',
            'expenses.*.attachments.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['message' => 'User tidak memiliki data employee.'], 403);
        }

        $spd = Spd::findOrFail($validated['spd_id']);

        if ($spd->status !== 'approved') {
            return response()->json(['message' => 'DPD hanya bisa dibuat dari SPD yang sudah approved.'], 422);
        }

        $isParticipant = SpdEmployee::where('spd_id', $spd->id)
            ->where('employee_id', $employee->id)
            ->exists();

        if (!$isParticipant && $employee->role->name !== 'super_admin') {
            return response()->json(['message' => 'Anda bukan peserta SPD ini.'], 403);
        }

        $isPrimary = SpdEmployee::where('spd_id', $spd->id)
            ->where('employee_id', $employee->id)
            ->where('is_primary', true)
            ->exists();

        if (!$isPrimary && $employee->role->name !== 'super_admin') {
            return response()->json(['message' => 'Hanya pengaju utama SPD yang dapat membuat DPD.'], 403);
        }

        $existingDpd = Dpd::where('spd_id', $spd->id)->first();
        if ($existingDpd) {
            return response()->json(['message' => 'SPD ini sudah memiliki DPD.'], 422);
        }

        $submissionDeadlineDays = app(AppSettingService::class)->getDpdSubmissionDeadlineDays();
        $deadline = $spd->end_date->addDays($submissionDeadlineDays);
        if (now()->gt($deadline)) {
            return response()->json([
                'message' => 'Batas waktu pengajuan DPD telah lewat. SPD selesai pada ' . $spd->end_date->format('d-m-Y') . ', batas pengajuan ' . $submissionDeadlineDays . ' hari setelahnya.'
            ], 422);
        }

        $dpd = DB::transaction(function () use ($validated, $spd, $employee) {
            $dpd = Dpd::create([
                'spd_id' => $spd->id,
                'employee_id' => $employee->id,
                'submission_date' => $validated['submission_date'],
                'status' => 'draft',
                'total_nominal' => 0,
            ]);

            if (!empty($validated['reports'])) {
                foreach ($validated['reports'] as $reportData) {
                    $attachmentPaths = [];
                    if (!empty($reportData['attachments'])) {
                        foreach ($reportData['attachments'] as $file) {
                            $attachmentPaths[] = $file->store('dpd_reports', 'public');
                        }
                    }

                    $dpd->reports()->create([
                        'title' => $reportData['title'],
                        'description' => $reportData['description'] ?? null,
                        'attachments' => $attachmentPaths,
                    ]);
                }
            }

            $totalNominal = 0;
            foreach ($validated['expenses'] as $expenseData) {
                $attachmentPaths = [];
                if (!empty($expenseData['attachments'])) {
                    foreach ($expenseData['attachments'] as $file) {
                        $attachmentPaths[] = $file->store('dpd_expenses', 'public');
                    }
                }

                $dpd->expenses()->create([
                    'category_id' => $expenseData['category_id'],
                    'description' => $expenseData['description'],
                    'amount' => $expenseData['amount'],
                    'expense_date' => $expenseData['expense_date'],
                    'attachments' => $attachmentPaths,
                ]);

                $totalNominal += (float) $expenseData['amount'];
            }

            $dpd->update(['total_nominal' => $totalNominal]);

            return $dpd;
        });

        $dpd->load(['spd', 'employee.user', 'reports', 'expenses.category']);

        $warnings = app(DpdApprovalService::class)->validateDpdSubmission($dpd);

        return response()->json(array_merge($dpd->toArray(), ['warnings' => $warnings]), 201);
    }

    public function update(Request $request, Dpd $dpd)
    {
        $user = $request->user();
        $employee = $user->employee;

        if ($employee && $employee->role->name !== 'super_admin') {
            if ($dpd->employee_id !== $employee->id) {
                return response()->json(['message' => 'Hanya pembuat DPD yang dapat mengedit.'], 403);
            }
        }

        if ($dpd->status !== 'draft') {
            return response()->json(['message' => 'Hanya DPD dengan status draft yang bisa diedit.'], 403);
        }

        $validated = $request->validate([
            'submission_date' => 'sometimes|date',
            'reports' => 'nullable|array',
            'reports.*.id' => 'nullable|exists:dpd_reports,id',
            'reports.*.title' => 'required_with:reports|string',
            'reports.*.description' => 'nullable|string',
            'reports.*.attachments' => 'nullable|array',
            'reports.*.attachments.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240',
            'expenses' => 'sometimes|array|min:1',
            'expenses.*.id' => 'nullable|exists:dpd_expenses,id',
            'expenses.*.category_id' => 'required_with:expenses|exists:dpd_expense_categories,id',
            'expenses.*.description' => 'required_with:expenses|string',
            'expenses.*.amount' => 'required_with:expenses|numeric|min:0',
            'expenses.*.expense_date' => 'required_with:expenses|date',
            'expenses.*.attachments' => 'nullable|array',
            'expenses.*.attachments.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $dpd = DB::transaction(function () use ($validated, $dpd) {
            if (isset($validated['submission_date'])) {
                $dpd->update(['submission_date' => $validated['submission_date']]);
            }

            if (isset($validated['reports'])) {
                $existingIds = $dpd->reports()->pluck('id')->toArray();
                $newIds = collect($validated['reports'])->whereNotNull('id')->pluck('id')->toArray();
                $toDelete = array_diff($existingIds, $newIds);

                foreach ($toDelete as $id) {
                    $report = DpdReport::find($id);
                    if ($report && $report->attachments) {
                        foreach ($report->attachments as $path) {
                            Storage::disk('public')->delete($path);
                        }
                    }
                    $report?->delete();
                }

                foreach ($validated['reports'] as $reportData) {
                    $attachmentPaths = [];
                    if (!empty($reportData['attachments'])) {
                        foreach ($reportData['attachments'] as $file) {
                            $attachmentPaths[] = $file->store('dpd_reports', 'public');
                        }
                    }

                    if (!empty($reportData['id'])) {
                        $report = DpdReport::find($reportData['id']);
                        $existingAttachments = $report->attachments ?? [];
                        $newAttachments = !empty($attachmentPaths) ? $attachmentPaths : $existingAttachments;
                        
                        $report->update([
                            'title' => $reportData['title'],
                            'description' => $reportData['description'] ?? null,
                            'attachments' => $newAttachments,
                        ]);
                    } else {
                        $dpd->reports()->create([
                            'title' => $reportData['title'],
                            'description' => $reportData['description'] ?? null,
                            'attachments' => $attachmentPaths,
                        ]);
                    }
                }
            }

            if (isset($validated['expenses'])) {
                $existingIds = $dpd->expenses()->pluck('id')->toArray();
                $newIds = collect($validated['expenses'])->whereNotNull('id')->pluck('id')->toArray();
                $toDelete = array_diff($existingIds, $newIds);

                foreach ($toDelete as $id) {
                    $expense = DpdExpense::find($id);
                    if ($expense && $expense->attachments) {
                        foreach ($expense->attachments as $path) {
                            Storage::disk('public')->delete($path);
                        }
                    }
                    $expense?->delete();
                }

                $totalNominal = 0;
                foreach ($validated['expenses'] as $expenseData) {
                    $attachmentPaths = [];
                    if (!empty($expenseData['attachments'])) {
                        foreach ($expenseData['attachments'] as $file) {
                            $attachmentPaths[] = $file->store('dpd_expenses', 'public');
                        }
                    }

                    if (!empty($expenseData['id'])) {
                        $expense = DpdExpense::find($expenseData['id']);
                        $existingAttachments = $expense->attachments ?? [];
                        $newAttachments = !empty($attachmentPaths) ? $attachmentPaths : $existingAttachments;
                        
                        $expense->update([
                            'category_id' => $expenseData['category_id'],
                            'description' => $expenseData['description'],
                            'amount' => $expenseData['amount'],
                            'expense_date' => $expenseData['expense_date'],
                            'attachments' => $newAttachments,
                        ]);
                        $totalNominal += $expenseData['amount'];
                    } else {
                        $dpd->expenses()->create([
                            'category_id' => $expenseData['category_id'],
                            'description' => $expenseData['description'],
                            'amount' => $expenseData['amount'],
                            'expense_date' => $expenseData['expense_date'],
                            'attachments' => $attachmentPaths,
                        ]);
                        $totalNominal += $expenseData['amount'];
                    }
                }

                $dpd->update(['total_nominal' => $totalNominal]);
            }

            return $dpd;
        });

        return response()->json($dpd->load(['spd', 'employee.user', 'reports', 'expenses.category']));
    }

    public function revise(Request $request, Dpd $dpd)
    {
        $user = $request->user();
        $employee = $user->employee;

        if ($employee && $employee->role->name !== 'super_admin') {
            if ($dpd->employee_id !== $employee->id) {
                return response()->json(['message' => 'Hanya pembuat DPD yang dapat melakukan revisi.'], 403);
            }
        }

        if ($dpd->status !== 'rejected') {
            return response()->json(['message' => 'Hanya DPD yang ditolak (rejected) yang bisa direvisi.'], 403);
        }

        DB::transaction(function () use ($dpd) {
            // Hapus logs yang terkait dengan chains
            $chainIds = $dpd->approvalChains()->pluck('id');
            \App\Models\ApprovalLog::where('approvable_type', \App\Models\DpdApprovalChain::class)
                ->whereIn('approvable_id', $chainIds)
                ->delete();

            // Hapus chains
            $dpd->approvalChains()->delete();

            // Ubah status ke draft
            $dpd->update(['status' => 'draft']);
        });

        return response()->json(['message' => 'DPD berhasil di-reset ke draft untuk revisi.']);
    }

    public function destroy(Request $request, Dpd $dpd)
    {
        $user = $request->user();
        $employee = $user->employee;

        if ($employee && $employee->role->name !== 'super_admin') {
            if ($dpd->employee_id !== $employee->id) {
                return response()->json(['message' => 'Hanya pembuat DPD yang dapat menghapus.'], 403);
            }
        }

        if ($dpd->status !== 'draft') {
            return response()->json(['message' => 'Hanya DPD dengan status draft yang bisa dihapus.'], 403);
        }

        foreach ($dpd->reports as $report) {
            if ($report->attachments) {
                foreach ($report->attachments as $path) {
                    Storage::disk('public')->delete($path);
                }
            }
        }

        foreach ($dpd->expenses as $expense) {
            if ($expense->attachments) {
                foreach ($expense->attachments as $path) {
                    Storage::disk('public')->delete($path);
                }
            }
        }

        $dpd->delete();

        return response()->json(null, 204);
    }

    public function categories()
    {
        return response()->json(DpdExpenseCategory::all());
    }

    public function downloadFile(Request $request)
    {
        $validated = $request->validate([
            'path' => 'required|string',
        ]);

        $filePath = $validated['path'];
        $fullPath = storage_path('app/public/' . $filePath);

        if (!file_exists($fullPath)) {
            return response()->json(['message' => 'File tidak ditemukan.'], 404);
        }

        $fileName = basename($filePath);
        
        return response()->download($fullPath, $fileName, [
            'Content-Type' => mime_content_type($fullPath),
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
        ]);
    }

    public function exportPdf(Dpd $dpd)
    {
        $user = request()->user();
        $employee = $user->employee;

        if ($employee && $employee->role->name !== 'super_admin') {
            $isCreator = $dpd->employee_id === $employee->id;
            if (!$isCreator) {
                $isParticipant = SpdEmployee::where('spd_id', $dpd->spd_id)
                    ->where('employee_id', $employee->id)
                    ->exists();
                if (!$isParticipant) {
                    return response()->json(['message' => 'Anda tidak memiliki akses untuk mengunduh PDF ini.'], 403);
                }
            }
        }

        $dpd->load([
            'spd.employees.employee.user',
            'employee.user',
            'reports',
            'expenses.category',
            'approvalChains.approver.user',
            'approvalChains.logs',
        ]);

        $tripDays = $dpd->spd ? $dpd->spd->start_date->diffInDays($dpd->spd->end_date) + 1 : 0;

        $html = $this->renderDpdHtml($dpd, $tripDays);
        
        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isPhpEnabled', true);
        $options->set('isRemoteEnabled', true);
        
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $filename = 'DPD_' . str_replace(['/', ' '], '_', $dpd->dpd_number) . '.pdf';

        return response()->streamDownload(function() use ($dompdf) {
            echo $dompdf->output();
        }, $filename, ['Content-Type' => 'application/pdf']);
    }

    protected function renderDpdHtml(Dpd $dpd, int $tripDays): string
    {
        $h = \App\Helpers\PdfHelper::class;

        $html = $h::htmlHead('Detail DPD - ' . $dpd->dpd_number, 'DPD');
        $html .= $h::watermark($dpd->status);
        $html .= $h::header('DPD');
        
        $html .= '<div class="doc-title">DOKUMENTASI PERJALANAN DINAS (DPD)</div>';

        $html .= '<div class="section">';
        $html .= '<div class="section-title">Informasi DPD</div>';
        $html .= '<div class="info-row"><div class="info-label">No. DPD:</div><div class="info-value">' . $h::escape($dpd->dpd_number) . '</div></div>';
        $html .= '<div class="info-row"><div class="info-label">Status:</div><div class="info-value">' . $h::statusBadge($dpd->status) . '</div></div>';
        $html .= '<div class="info-row"><div class="info-label">Pengaju:</div><div class="info-value">' . $h::escape($dpd->employee?->user?->name ?? '-') . '</div></div>';
        $html .= '<div class="info-row"><div class="info-label">Departemen:</div><div class="info-value">' . $h::escape($dpd->employee?->department?->name ?? '-') . '</div></div>';
        $html .= '<div class="info-row"><div class="info-label">Total Nominal:</div><div class="info-value"><strong>' . $h::formatCurrency($dpd->total_nominal) . '</strong></div></div>';
        $html .= '<div class="info-row"><div class="info-label">Tanggal Pengajuan:</div><div class="info-value">' . $h::formatDate($dpd->submission_date) . '</div></div>';
        if ($dpd->spm_date) {
            $html .= '<div class="info-row"><div class="info-label">Tanggal SPM:</div><div class="info-value">' . $h::formatDate($dpd->spm_date) . '</div></div>';
        }
        $html .= '</div>';

        if ($dpd->spd) {
            $html .= '<div class="section">';
            $html .= '<div class="section-title">Referensi SPD</div>';
            $html .= '<div class="info-row"><div class="info-label">No. SPD:</div><div class="info-value">' . $h::escape($dpd->spd->spd_number) . '</div></div>';
            $html .= '<div class="info-row"><div class="info-label">Tujuan:</div><div class="info-value">' . $h::escape($dpd->spd->destination) . '</div></div>';
            $html .= '<div class="info-row"><div class="info-label">Keperluan:</div><div class="info-value">' . $h::escape($dpd->spd->purpose) . '</div></div>';
            $html .= '<div class="info-row"><div class="info-label">Periode:</div><div class="info-value">' . $h::formatDate($dpd->spd->start_date) . ' s/d ' . $h::formatDate($dpd->spd->end_date) . ' (' . $tripDays . ' hari)</div></div>';
            $html .= '</div>';

            $html .= '<div class="section">';
            $html .= '<div class="section-title">Peserta Perjalanan Dinas</div>';
            $html .= '<table><thead><tr><th>Nama</th><th>Departemen</th><th>Status</th></tr></thead><tbody>';
            foreach ($dpd->spd->employees as $se) {
                $html .= '<tr>';
                $html .= '<td>' . $h::escape($se->employee?->user?->name ?? $se->employee?->name ?? '-') . '</td>';
                $html .= '<td>' . $h::escape($se->employee?->department?->name ?? '-') . '</td>';
                $html .= '<td>' . ($se->is_primary ? '<strong>Pemohon Utama</strong>' : 'Peserta') . '</td>';
                $html .= '</tr>';
            }
            $html .= '</tbody></table>';
            $html .= '</div>';
        }

        $html .= '<div class="section">';
        $html .= '<div class="section-title">Laporan Kegiatan</div>';
        if ($dpd->reports && count($dpd->reports) > 0) {
            foreach ($dpd->reports as $idx => $r) {
                $html .= '<div style="margin-bottom:15px; padding:10px; background:#f9fafb; border-left:3px solid #10b981; border-radius:4px;">';
                $html .= '<div class="info-row"><div class="info-label">Laporan #' . ($idx + 1) . ':</div><div class="info-value"><strong>' . $h::escape($r->title) . '</strong></div></div>';
                if ($r->description) {
                    $html .= '<div class="info-row"><div class="info-label">Deskripsi:</div><div class="info-value">' . nl2br($h::escape($r->description)) . '</div></div>';
                }
                if ($r->attachment_path) {
                    $html .= '<div class="info-row"><div class="info-label">File Lampiran:</div><div class="info-value">' . $h::escape(basename($r->attachment_path)) . '</div></div>';
                }
                $html .= '</div>';
            }
        } else {
            $html .= '<p style="color:#6b7280; font-style:italic;">Tidak ada laporan kegiatan.</p>';
        }
        $html .= '</div>';

        $html .= '<div class="section">';
        $html .= '<div class="section-title">Rincian Biaya / Reimbursement</div>';
        if ($dpd->expenses && count($dpd->expenses) > 0) {
            $html .= '<table>';
            $html .= '<thead><tr><th style="width:20%;">Kategori</th><th style="width:35%;">Deskripsi</th><th style="width:20%;">Nominal</th><th style="width:25%;">Tanggal</th></tr></thead>';
            $html .= '<tbody>';
            $total = 0;
            foreach ($dpd->expenses as $e) {
                $catName = $e->category ? $e->category->name : $e->category_id;
                $html .= '<tr>';
                $html .= '<td>' . $h::escape($catName) . '</td>';
                $html .= '<td>' . $h::escape($e->description) . '</td>';
                $html .= '<td style="text-align:right;">' . $h::formatCurrency($e->amount) . '</td>';
                $html .= '<td>' . $h::formatDate($e->expense_date) . '</td>';
                $html .= '</tr>';
                $total += (float) $e->amount;
            }
            $html .= '<tr class="total-row">';
            $html .= '<td colspan="2" style="text-align:right;"><strong>TOTAL BIAYA</strong></td>';
            $html .= '<td style="text-align:right;"><strong>' . $h::formatCurrency($total) . '</strong></td>';
            $html .= '<td></td>';
            $html .= '</tr>';
            $html .= '</tbody></table>';
        } else {
            $html .= '<p style="color:#6b7280; font-style:italic;">Tidak ada item biaya.</p>';
        }
        $html .= '</div>';

        if (!empty($dpd->approvalChains)) {
            $html .= '<div class="section">';
            $html .= '<div class="section-title">Riwayat Persetujuan</div>';
            $html .= '<table>';
            $html .= '<thead><tr><th>Level</th><th>Nama Approver</th><th>Role</th><th>Status</th><th>Tanggal</th><th>Catatan</th></tr></thead>';
            $html .= '<tbody>';
            
            $approvers = [];
            foreach ($dpd->approvalChains as $chain) {
                $approverName = $chain->approver ? ($chain->approver->user ? $chain->approver->user->name : $chain->approver->name) : '-';
                $approverRole = $chain->approver?->role?->name ?? '-';
                $rejectLog = $chain->logs ? $chain->logs->firstWhere('action', 'rejected') : null;
                $approveLog = $chain->logs ? $chain->logs->firstWhere('action', 'approved') : null;
                $log = $rejectLog ?? $approveLog;
                
                $html .= '<tr>';
                $html .= '<td>Level ' . $chain->level_order . '</td>';
                $html .= '<td>' . $h::escape($approverName) . '</td>';
                $html .= '<td>' . $h::escape($approverRole) . '</td>';
                $html .= '<td>' . $h::statusBadge($chain->status) . '</td>';
                $html .= '<td>' . ($log ? $h::formatDate($log->created_at) : '-') . '</td>';
                $html .= '<td>' . ($rejectLog ? $h::escape($rejectLog->rejection_reason) : '-') . '</td>';
                $html .= '</tr>';
                
                if ($chain->status === 'approved') {
                    $approvers[] = [
                        'name' => $approverName,
                        'role' => $approverRole,
                    ];
                }
            }
            $html .= '</tbody></table>';
            $html .= '</div>';
            
            $requesterName = $dpd->employee?->user?->name ?? 'Pemohon';
            $requesterRole = $dpd->employee?->role?->name ?? 'Karyawan';
            
            $html .= $h::signatureBoxes($approvers, $requesterName, $requesterRole);
        }

        $html .= $h::footer();
        $html .= '</body></html>';

        return $html;
    }
}
