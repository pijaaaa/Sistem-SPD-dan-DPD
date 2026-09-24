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
        Schema::create('approval_logs', function (Blueprint $table) {
            $table->id();
            $table->morphs('approvable'); // spd_approval_chain_id / dpd_approval_chain_id
            $table->foreignId('approver_employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('acted_on_behalf_of')->nullable()->constrained('employees')->nullOnDelete();
            $table->enum('action', ['approved', 'rejected']);
            $table->string('role_at_approval');
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_logs');
    }
};
