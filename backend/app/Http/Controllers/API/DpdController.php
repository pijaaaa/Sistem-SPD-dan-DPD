<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Dpd;
use App\Models\Spd;
use App\Models\Employee;
use App\Models\DpdExpenseCategory;
use App\Http\Requests\CreateDpdRequest;
use App\Services\DpdNumberGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class DpdController extends Controller
{
    protected $numberGenerator;

    public function __construct(DpdNumberGeneratorService $numberGenerator)
    {
        $this->numberGenerator = $numberGenerator;
    }

    public function index()
    {
        $dpds = Dpd::with(['spd', 'employee', 'reports', 'expenses.category'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($dpds);
    }

    public function show(Dpd $dpd)
    {
        $dpd->load(['spd', 'employee', 'reports', 'expenses.category']);

        return response()->json($dpd);
    }

    public function store(CreateDpdRequest $request)
    {
        $data = $request->validated();

        // Pastikan employee terkait dengan SPD
        $spd = Spd::with('employees')->findOrFail($data['spd_id']);
        $requestedEmployee = Employee::findOrFail($data['employee_id']);

        // Validasi employee terikat dengan SPD (pemohon utama atau pengikut)
        $isPrimary = SpdEmployee::where('spd_id', $spd->id)
            ->where('employee_id', $requestedEmployee->id)
            ->where('is_primary', true)
            ->exists();

        $isFollower = SpdEmployee::where('spd_id', $spd->id)
            ->where('employee_id', $requestedEmployee->id)
            ->exists();

        if (!$isPrimary && !$isFollower) {
            // Cek apakah user adalah super_admin atau admin departemen terkait
            if (!auth()->user() || auth()->user()->cannot('manage', $spd)) {
                return response()->json([
                    'message' => 'Hanya pemohon SPD (primary), pengikut SPD, atau admin departemen yang boleh membuat DPD ini.'
                ], 403);
            }
        }

        return DB::transaction(function () use ($data, $spd, $requestedEmployee) {
            // Generate nomor DPD
            $dpd = Dpd::create([
                'spd_id' => $spd->id,
                'employee_id' => $requestedEmployee->id,
                'submission_date' => $data['submission_date'],
                'status' => 'draft',
            ]);

            $this->numberGenerator->generateNumber($dpd);

            // Process laporan kegiatan (optional)
            if (isset($data['reports']) && is_array($data['reports'])) {
                foreach ($data['reports'] as $reportData) {
                    $attachmentPath = null;
                    if (isset($reportData['attachment']) && $reportData['attachment'] instanceof \Illuminate\Http\UploadedFile) {
                        $attachmentPath = $reportData['attachment']->store('dpd_reports', 'public');
                    }

                    $dpd->reports()->create([
                        'title' => $reportData['title'] ?? '',
                        'description' => $reportData['description'] ?? null,
                        'attachment_path' => $attachmentPath,
                    ]);
                }
            }

            // Process item nota (wajib minimal 1)
            if (isset($data['expenses']) && is_array($data['expenses'])) {
                // Validasi minimal 1 item nota
                $validExpenses = array_filter($data['expenses'], function ($item) {
                    return !empty($item['description']) && !empty($item['amount']) && !empty($item['expense_date']);
                });

                if (empty($validExpenses)) {
                    $dpd->delete();
                    return response()->json([
                        'message' => 'Minimal ada 1 item nota yang valid.'
                    ], 422);
                }

                foreach ($data['expenses'] as $expenseData) {
                    // Validasi item
                    if (empty($expenseData['description']) || empty($expenseData['amount']) || empty($expenseData['expense_date'])) {
                        continue;
                    }

                    $attachmentPath = null;
                    if (isset($expenseData['attachment']) && $expenseData['attachment'] instanceof \Illuminate\Http\UploadedFile) {
                        $attachmentPath = $expenseData['attachment']->store('dpd_expenses', 'public');
                    }

                    $categoryId = null;
                    if (!empty($expenseData['category_id'])) {
                        $categoryId = $expenseData['category_id'];
                    } else {
                        // Default ke kategori "lain-lain" jika tidak dipilih
                        $defaultCategory = DpdExpenseCategory::where('code', 'other')->first();
                        if ($defaultCategory) {
                            $categoryId = $defaultCategory->id;
                        }
                    }

                    $dpd->expenses()->create([
                        'category_id' => $categoryId,
                        'description' => $expenseData['description'],
                        'amount' => (float) $expenseData['amount'],
                        'expense_date' => $expenseData['expense_date'],
                        'attachment_path' => $attachmentPath,
                    ]);
                }
            }

            // Hitung total nominal
            $dpd->calculateTotalNominal();

            return response()->json($dpd->load(['spd', 'employee', 'reports', 'expenses.category']), 201);
        });
    }

    public function update(Request $request, Dpd $dpd)
    {
        $data = $request->validated();

        // Cek bisa diedit (hanya draft)
        if ($dpd->status !== 'draft') {
            return response()->json([
                'message' => 'Hanya DPD dengan status draft yang bisa diedit.'
            ], 403);
        }

        return DB::transaction(function () use ($request, $dpd) {
            // Update laporan kegiatan
            if (isset($data['reports'])) {
                foreach ($dpd->reports as $report) {
                    if (isset($data['reports'][$report->id])) {
                        // Update existing
                        $reportData = $data['reports'][$report->id];
                        $attachmentPath = $report->attachment_path;

                        if (isset($reportData['attachment']) && $reportData['attachment'] instanceof \Illuminate\Http\UploadedFile) {
                            // Hapus file lama
                            if ($report->attachment_path) {
                                Storage::delete($report->attachment_path);
                            }
                            $attachmentPath = $reportData['attachment']->store('dpd_reports', 'public');
                        }

                        $report->update([
                            'title' => $reportData['title'] ?? $report->title,
                            'description' => $reportData['description'] ?? $report->description,
                            'attachment_path' => $attachmentPath,
                        ]);
                    } else {
                        // Hapus
                        if ($report->attachment_path) {
                            Storage::delete($report->attachment_path);
                        }
                        $report->delete();
                    }
                }

                // Tambah laporan baru
                if (isset($data['reports']['new'])) {
                    $newReport = $data['reports']['new'];
                    $attachmentPath = null;
                    if (isset($newReport['attachment']) && $newReport['attachment'] instanceof \Illuminate\Http\UploadedFile) {
                        $attachmentPath = $newReport['attachment']->store('dpd_reports', 'public');
                    }

                    $dpd->reports()->create([
                        'title' => $newReport['title'] ?? '',
                        'description' => $newReport['description'] ?? null,
                        'attachment_path' => $attachmentPath,
                    ]);
                }
            }

            // Update item nota
            if (isset($data['expenses'])) {
                foreach ($dpd->expenses as $expense) {
                    if (isset($data['expenses'][$expense->id])) {
                        $expenseData = $data['expenses'][$expense->id];
                        $attachmentPath = $expense->attachment_path;

                        if (isset($expenseData['attachment']) && $expenseData['attachment'] instanceof \Illuminate\Http\UploadedFile) {
                            if ($expense->attachment_path) {
                                Storage::delete($expense->attachment_path);
                            }
                            $attachmentPath = $expenseData['attachment']->store('dpd_expenses', 'public');
                        }

                        $expense->update([
                            'category_id' => $expenseData['category_id'] ?? $expense->category_id,
                            'description' => $expenseData['description'] ?? $expense->description,
                            'amount' => (float) ($expenseData['amount'] ?? $expense->amount),
                            'expense_date' => $expenseData['expense_date'] ?? $expense->expense_date,
                            'attachment_path' => $attachmentPath,
                        ]);
                    } else {
                        // Hapus
                        if ($expense->attachment_path) {
                            Storage::delete($expense->attachment_path);
                        }
                        $expense->delete();
                    }
                }

                // Tambah item nota baru
                if (isset($data['expenses']['new'])) {
                    $newExpense = $data['expenses']['new'];
                    // Validasi minimal
                    if (empty($newExpense['description']) || empty($newExpense['amount']) || empty($newExpense['expense_date'])) {
                        return response()->json([
                            'message' => 'Item nota harus memiliki deskripsi, nominal, dan tanggal.'
                        ], 422);
                    }

                    $attachmentPath = null;
                    if (isset($newExpense['attachment']) && $newExpense['attachment'] instanceof \Illuminate\Http\UploadedFile) {
                        $attachmentPath = $newExpense['attachment']->store('dpd_expenses', 'public');
                    }

                    $categoryId = !empty($newExpense['category_id']) ? $newExpense['category_id'] : null;
                    if (!$categoryId) {
                        $defaultCategory = DpdExpenseCategory::where('code', 'other')->first();
                        if ($defaultCategory) {
                            $categoryId = $defaultCategory->id;
                        }
                    }

                    $dpd->expenses()->create([
                        'category_id' => $categoryId,
                        'description' => $newExpense['description'],
                        'amount' => (float) $newExpense['amount'],
                        'expense_date' => $newExpense['expense_date'],
                        'attachment_path' => $attachmentPath,
                    ]);
                }
            }

            // Hitung ulang total nominal
            $dpd->calculateTotalNominal();

            return $dpd->load(['reports', 'expenses.category']);
        });
    }

    public function destroy(Dpd $dpd)
    {
        if ($dpd->status !== 'draft') {
            return response()->json([
                'message' => 'Hanya DPD dengan status draft yang bisa dihapus.'
            ], 403);
        }

        $dpd->expenses()->delete();
        $dpd->reports()->delete();
        $dpd->delete();

        return response()->json(null, 204);
    }
}