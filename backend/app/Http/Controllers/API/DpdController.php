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
            $query->where('employee_id', $employee->id);
        }

        $dpds = $query->orderBy('created_at', 'desc')->get();

        return response()->json($dpds);
    }

    public function show(Dpd $dpd)
    {
        $dpd->load(['spd.employees.employee', 'employee.user', 'reports', 'expenses.category']);

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

    public function destroy(Dpd $dpd)
    {
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
}
