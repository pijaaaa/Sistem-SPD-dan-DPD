<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('spds', function (Blueprint $table) {
            $table->foreignId('main_department_id')
                ->nullable()
                ->after('is_cross_department')
                ->constrained('departments');
        });

        DB::statement('UPDATE spds SET main_department_id = (SELECT e.department_id FROM spd_employees se JOIN employees e ON se.employee_id = e.id WHERE se.spd_id = spds.id AND se.is_primary = 1 LIMIT 1)');
    }

    public function down(): void
    {
        Schema::table('spds', function (Blueprint $table) {
            $table->dropForeign(['main_department_id']);
            $table->dropColumn('main_department_id');
        });
    }
};