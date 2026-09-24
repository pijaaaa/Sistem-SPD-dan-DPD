<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('spd_approval_chains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spd_id')->constrained('spds')->cascadeOnDelete();
            $table->foreignId('spd_employee_id')->nullable()->constrained('spd_employees')->cascadeOnDelete();
            $table->foreignId('approver_employee_id')->constrained('employees')->cascadeOnDelete();
            $table->integer('level_order');
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spd_approval_chains');
    }
};
