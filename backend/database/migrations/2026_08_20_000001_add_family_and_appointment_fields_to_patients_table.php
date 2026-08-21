<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // Family linking
            $table->unsignedBigInteger('family_id')->nullable()->after('id');
            $table->string('relation')->nullable()->after('family_id');
            // Appointment scheduling
            $table->dateTime('appointment_time')->nullable()->after('status');
        });

        // Update status enum to include pending and enquired
        Schema::table('patients', function (Blueprint $table) {
            $table->enum('status', ['pending', 'enquired', 'assigned', 'consulted', 'completed'])
                ->default('pending')
                ->change();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['family_id', 'relation', 'appointment_time']);
            $table->enum('status', ['assigned', 'consulted', 'completed'])
                ->default('assigned')
                ->change();
        });
    }
};