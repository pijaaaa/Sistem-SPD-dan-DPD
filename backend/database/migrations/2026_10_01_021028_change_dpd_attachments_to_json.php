<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update dpd_reports: ubah attachment_path dari string ke json
        Schema::table('dpd_reports', function (Blueprint $table) {
            $table->json('attachments')->nullable()->after('description');
        });

        // Migrasi data lama: convert attachment_path ke attachments array
        DB::table('dpd_reports')->whereNotNull('attachment_path')->get()->each(function ($report) {
            DB::table('dpd_reports')
                ->where('id', $report->id)
                ->update([
                    'attachments' => json_encode([$report->attachment_path])
                ]);
        });

        Schema::table('dpd_reports', function (Blueprint $table) {
            $table->dropColumn('attachment_path');
        });

        // Update dpd_expenses: ubah attachment_path dari string ke json
        Schema::table('dpd_expenses', function (Blueprint $table) {
            $table->json('attachments')->nullable()->after('expense_date');
        });

        // Migrasi data lama: convert attachment_path ke attachments array
        DB::table('dpd_expenses')->whereNotNull('attachment_path')->get()->each(function ($expense) {
            DB::table('dpd_expenses')
                ->where('id', $expense->id)
                ->update([
                    'attachments' => json_encode([$expense->attachment_path])
                ]);
        });

        Schema::table('dpd_expenses', function (Blueprint $table) {
            $table->dropColumn('attachment_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rollback dpd_reports
        Schema::table('dpd_reports', function (Blueprint $table) {
            $table->string('attachment_path')->nullable()->after('description');
        });

        DB::table('dpd_reports')->whereNotNull('attachments')->get()->each(function ($report) {
            $attachments = json_decode($report->attachments, true);
            if (is_array($attachments) && count($attachments) > 0) {
                DB::table('dpd_reports')
                    ->where('id', $report->id)
                    ->update(['attachment_path' => $attachments[0]]);
            }
        });

        Schema::table('dpd_reports', function (Blueprint $table) {
            $table->dropColumn('attachments');
        });

        // Rollback dpd_expenses
        Schema::table('dpd_expenses', function (Blueprint $table) {
            $table->string('attachment_path')->nullable()->after('expense_date');
        });

        DB::table('dpd_expenses')->whereNotNull('attachments')->get()->each(function ($expense) {
            $attachments = json_decode($expense->attachments, true);
            if (is_array($attachments) && count($attachments) > 0) {
                DB::table('dpd_expenses')
                    ->where('id', $expense->id)
                    ->update(['attachment_path' => $attachments[0]]);
            }
        });

        Schema::table('dpd_expenses', function (Blueprint $table) {
            $table->dropColumn('attachments');
        });
    }
};
