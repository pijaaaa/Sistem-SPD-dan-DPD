<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite (used in testing) recreates tables from scratch with the
        // correct enum values from the create_dpds_table migration.
        // This migration only targets existing MySQL databases where
        // the enum was created without 'revisi'.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `dpds` MODIFY COLUMN `status` ENUM('draft','submitted','approved','revisi','rejected','cancelled') DEFAULT 'draft' NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `dpds` MODIFY COLUMN `status` ENUM('draft','submitted','approved','rejected','cancelled') DEFAULT 'draft' NOT NULL");
        }
    }
};
