<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `dpds` MODIFY COLUMN `status` ENUM('draft','submitted','approved','revisi','rejected','cancelled') DEFAULT 'draft' NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `dpds` MODIFY COLUMN `status` ENUM('draft','submitted','approved','rejected','cancelled') DEFAULT 'draft' NOT NULL");
    }
};
