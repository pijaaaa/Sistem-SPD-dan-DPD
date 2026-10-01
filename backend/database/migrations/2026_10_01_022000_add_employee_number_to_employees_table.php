<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('no_pekerja')->unique()->nullable()->after('nip');
            $table->string('employee_number')->unique()->nullable()->after('nip');
        });

        $driver = Schema::connection(null)->getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("UPDATE employees SET no_pekerja = CONCAT('EMP-', LPAD(id, 5, '0')) WHERE no_pekerja IS NULL");
            DB::statement("UPDATE employees SET employee_number = no_pekerja WHERE employee_number IS NULL");
        } elseif ($driver === 'sqlite') {
            DB::statement("UPDATE employees SET no_pekerja = 'EMP-' || printf('%05d', id) WHERE no_pekerja IS NULL");
            DB::statement("UPDATE employees SET employee_number = no_pekerja WHERE employee_number IS NULL");
        }
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropUnique(['employee_number']);
            $table->dropColumn('employee_number');
            $table->dropUnique(['no_pekerja']);
            $table->dropColumn('no_pekerja');
        });
    }
};
