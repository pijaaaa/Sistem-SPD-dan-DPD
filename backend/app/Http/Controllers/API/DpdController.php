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
            'reports.*.attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'expenses' => 'required|array|min:1',
            'expenses.*.category_id' => 'required|exists:dpd_expense_categories,id',
            'expenses.*.description' => 'required|string',
            'expenses.*.amount' => 'required|numeric|min:0',
            'expenses.*.expense_date' => 'required|date',
            'expenses.*.attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
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
                    $attachmentPath = null;
                    if (!empty($reportData['attachment'])) {
                        $attachmentPath = $reportData['attachment']->store('dpd_reports', 'public');
                    }

                    $dpd->reports()->create([
                        'title' => $reportData['title'],
                        'description' => $reportData['description'] ?? null,
                        'attachment_path' => $attachmentPath,
                    ]);
                }
            }

            $totalNominal = 0;
            foreach ($validated['expenses'] as $expenseData) {
                $attachmentPath = null;
                if (!empty($expenseData['attachment'])) {
                    $attachmentPath = $expenseData['attachment']->store('dpd_expenses', 'public');
                }

                $dpd->expenses()->create([
                    'category_id' => $expenseData['category_id'],
                    'description' => $expenseData['description'],
                    'amount' => $expenseData['amount'],
                    'expense_date' => $expenseData['expense_date'],
                    'attachment_path' => $attachmentPath,
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
            'reports.*.attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'expenses' => 'sometimes|array|min:1',
            'expenses.*.id' => 'nullable|exists:dpd_expenses,id',
            'expenses.*.category_id' => 'required_with:expenses|exists:dpd_expense_categories,id',
            'expenses.*.description' => 'required_with:expenses|string',
            'expenses.*.amount' => 'required_with:expenses|numeric|min:0',
            'expenses.*.expense_date' => 'required_with:expenses|date',
            'expenses.*.attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $dpd = DB::transaction(function () use ($validated, $dpd) {
            if (isset($validated['submission_date'])) {
                $dpd->update(['submission_date' => $validated['submission_date']]);
            }

            if (isset($validated['reports'])) {
                $existingIds = $dpd->reports()->pluck('id')->toArray();
                $newIds = collect($validated['reports'])->whereNotNull('id')->pluck('id')->toArray();
                $toDelete = array_diff($existingIds, $newIds);

                DpdReport::destroy($toDelete);

                foreach ($validated['reports'] as $reportData) {
                    $attachmentPath = null;
                    if (!empty($reportData['attachment'])) {
                        $attachmentPath = $reportData['attachment']->store('dpd_reports', 'public');
                    }

                    if (!empty($reportData['id'])) {
                        $report = DpdReport::find($reportData['id']);
                        $report->update([
                            'title' => $reportData['title'],
                            'description' => $reportData['description'] ?? null,
                            'attachment_path' => $attachmentPath ?? $report->attachment_path,
                        ]);
                    } else {
                        $dpd->reports()->create([
                            'title' => $reportData['title'],
                            'description' => $reportData['description'] ?? null,
                            'attachment_path' => $attachmentPath,
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
                    if ($expense->attachment_path) {
                        Storage::disk('public')->delete($expense->attachment_path);
                    }
                    $expense->delete();
                }

                $totalNominal = 0;
                foreach ($validated['expenses'] as $expenseData) {
                    $attachmentPath = null;
                    if (!empty($expenseData['attachment'])) {
                        $attachmentPath = $expenseData['attachment']->store('dpd_expenses', 'public');
                    }

                    if (!empty($expenseData['id'])) {
                        $expense = DpdExpense::find($expenseData['id']);
                        $expense->update([
                            'category_id' => $expenseData['category_id'],
                            'description' => $expenseData['description'],
                            'amount' => $expenseData['amount'],
                            'expense_date' => $expenseData['expense_date'],
                            'attachment_path' => $attachmentPath ?? $expense->attachment_path,
                        ]);
                        $totalNominal += $expenseData['amount'];
                    } else {
                        $dpd->expenses()->create([
                            'category_id' => $expenseData['category_id'],
                            'description' => $expenseData['description'],
                            'amount' => $expenseData['amount'],
                            'expense_date' => $expenseData['expense_date'],
                            'attachment_path' => $attachmentPath,
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
            if ($report->attachment_path) {
                Storage::disk('public')->delete($report->attachment_path);
            }
        }

        foreach ($dpd->expenses as $expense) {
            if ($expense->attachment_path) {
                Storage::disk('public')->delete($expense->attachment_path);
            }
        }

        $dpd->delete();

        return response()->json(null, 204);
    }

    public function categories()
    {
        return response()->json(DpdExpenseCategory::all());
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

        $pdf = app('dompdf.wrapper');
        $html = $this->renderDpdHtml($dpd, $tripDays);

        $filename = 'DPD_' . str_replace(['/', ' '], '_', $dpd->dpd_number) . '.pdf';

        return $pdf->loadHTML($html)->download($filename);
    }

    protected function renderDpdHtml(Dpd $dpd, int $tripDays): string
    {
        $h = \App\Helpers\PdfHelper::class;

        $html = $h::htmlHead('Detail DPD');
        $html .= '<h1>Detail DPD ' . $h::escape($dpd->dpd_number) . '</h1>';

        $html .= '<div class="section">';
        $html .= '<div class="label">No. DPD:</div> ' . $h::escape($dpd->dpd_number) . '<br>';
        $html .= '<div class="label">Status:</div> ' . $h::statusBadge($dpd->status) . '<br>';
        $html .= '<div class="label">Pengaju:</div> ' . $h::escape($dpd->employee?->user?->name ?? '-') . '<br>';
        $html .= '<div class="label">Total Nominal:</div> ' . $h::formatCurrency($dpd->total_nominal) . '<br>';
        $html .= '<div class="label">Tanggal Pengajuan:</div> ' . $h::formatDate($dpd->submission_date) . '<br>';
        if ($dpd->spm_date) {
            $html .= '<div class="label">Tanggal SPM:</div> ' . $h::formatDate($dpd->spm_date) . '<br>';
        }
        $html .= '</div>';

        if ($dpd->spd) {
            $html .= '<div class="section"><h2>SPD Terkait</h2>';
            $html .= '<div class="label">No. SPD:</div> ' . $h::escape($dpd->spd->spd_number) . '<br>';
            $html .= '<div class="label">Tujuan:</div> ' . $h::escape($dpd->spd->destination) . '<br>';
            $html .= '<div class="label">Periode:</div> ' . $h::formatDate($dpd->spd->start_date) . ' s/d ' . $h::formatDate($dpd->spd->end_date) . '<br>';
            $html .= '<div class="label">Jumlah Hari:</div> ' . $tripDays . ' hari<br>';
            $html .= '</div>';

            $html .= '<div class="section"><h2>Peserta SPD</h2><table><thead><tr><th>Nama</th><th>Pemohon Utama</th></tr></thead><tbody>';
            foreach ($dpd->spd->employees as $se) {
                $html .= '<tr><td>' . $h::escape($se->employee?->user?->name ?? $se->employee?->name ?? '-') . '</td>';
                $html .= '<td>' . ($se->is_primary ? 'Ya' : 'Tidak') . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }

        $html .= '<div class="section"><h2>Laporan Kegiatan</h2>';
        if ($dpd->reports && count($dpd->reports) > 0) {
            foreach ($dpd->reports as $r) {
                $html .= '<div style="margin-bottom:8px"><div class="label">Judul:</div> ' . $h::escape($r->title) . '<br>';
                if ($r->description) {
                    $html .= '<div class="label">Deskripsi:</div> ' . $h::escape($r->description) . '<br>';
                }
                if ($r->attachment_path) {
                    $html .= '<div class="label">File:</div> ' . $h::escape($r->attachment_path) . '<br>';
                }
                $html .= '</div>';
            }
        } else {
            $html .= '<p>Tidak ada laporan kegiatan.</p>';
        }
        $html .= '</div>';

        $html .= '<div class="section"><h2>Item Nota / Reimbursement</h2>';
        if ($dpd->expenses && count($dpd->expenses) > 0) {
            $html .= '<table><thead><tr><th>Kategori</th><th>Deskripsi</th><th>Nominal</th><th>Tanggal</th></tr></thead><tbody>';
            $total = 0;
            foreach ($dpd->expenses as $e) {
                $catName = $e->category ? $e->category->name : $e->category_id;
                $html .= '<tr>';
                $html .= '<td>' . $h::escape($catName) . '</td>';
                $html .= '<td>' . $h::escape($e->description) . '</td>';
                $html .= '<td>' . $h::formatCurrency($e->amount) . '</td>';
                $html .= '<td>' . $h::formatDate($e->expense_date) . '</td>';
                $html .= '</tr>';
                $total += (float) $e->amount;
            }
            $html .= '<tr><td colspan="3"><strong>Total</strong></td><td><strong>' . $h::formatCurrency($total) . '</strong></td></tr>';
            $html .= '</tbody></table>';
        } else {
            $html .= '<p>Tidak ada item nota.</p>';
        }
        $html .= '</div>';

        if (!empty($dpd->approvalChains)) {
            $html .= '<div class="section"><h2>Riwayat Persetujuan</h2><table><thead><tr><th>Level</th><th>Nama</th><th>Status</th><th>Tanggal</th><th>Alasan Penolakan</th></tr></thead><tbody>';
            foreach ($dpd->approvalChains as $chain) {
                $approverName = $chain->approver ? ($chain->approver->user ? $chain->approver->user->name : $chain->approver->name) : '-';
                $rejectLog = $chain->logs ? $chain->logs->firstWhere('action', 'rejected') : null;
                $html .= '<tr>';
                $html .= '<td>' . $chain->level_order . '</td>';
                $html .= '<td>' . $h::escape($approverName) . '</td>';
                $html .= '<td>' . $h::statusBadge($chain->status) . '</td>';
                $html .= '<td>' . ($rejectLog ? $h::formatDate($rejectLog->created_at) : '-') . '</td>';
                $html .= '<td>' . ($rejectLog ? $h::escape($rejectLog->rejection_reason) : '-') . '</td>';
                $html .= '</tr>';
            }
            $html .= '</tbody></table></div>';
        }

        $html .= '</body></html>';

        return $html;
    }
}
