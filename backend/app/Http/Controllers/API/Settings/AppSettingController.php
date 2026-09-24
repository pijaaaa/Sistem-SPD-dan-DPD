<?php

namespace App\Http\Controllers\API\Settings;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AppSettingService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppSettingController extends Controller
{
    protected $appSettingService;

    public function __construct(AppSettingService $appSettingService)
    {
        $this->appSettingService = $appSettingService;
    }

    public function index()
    {
        $settings = AppSetting::orderBy('key')->get();
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => [
                'required',
                Rule::in(['dpd_submission_deadline_days', 'max_nominal_per_day']),
            ],
            'settings.*.value' => 'required|string',
        ]);

        $errors = [];

        foreach ($validated['settings'] as $setting) {
            $key = $setting['key'];
            $value = $setting['value'];

            // Validasi tipe data per key
            if ($key === 'dpd_submission_deadline_days') {
                if (!ctype_digit((string) $value) || (int) $value <= 0) {
                    $errors[$key] = 'Batas waktu pengajuan DPD harus berupa bilangan bulat positif (hari).';
                    continue;
                }
            }

            if ($key === 'max_nominal_per_day') {
                if (!is_numeric($value) || (float) $value <= 0) {
                    $errors[$key] = 'Maksimal nominal per hari harus berupa angka positif.';
                    continue;
                }
            }

            $this->appSettingService->set($key, $value);
        }

        if (!empty($errors)) {
            return response()->json(['message' => 'Sebagian pengaturan gagal disimpan.', 'errors' => $errors], 422);
        }

        return response()->json($this->appSettingService->getAll());
    }

    public function history()
    {
        $logs = $this->appSettingService->getAllHistory();

        return response()->json($logs->map(function ($log) {
            return [
                'key' => $log->key,
                'old_value' => $log->old_value,
                'new_value' => $log->new_value,
                'changed_by' => $log->changed_by,
                'changed_by_name' => $log->changedBy ? $log->changedBy->name : 'Sistem',
                'changed_at' => $log->created_at,
            ];
        }));
    }
}