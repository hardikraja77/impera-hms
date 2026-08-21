<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('specialization');
            $table->string('phone')->nullable();
            $table->decimal('consultation_fee', 8, 2)->default(0);
            $table->text('available_days')->nullable(); // JSON: ["Mon","Tue",...]
            $table->time('available_from')->default('09:00');
            $table->time('available_to')->default('17:00');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctors');
    }
};
