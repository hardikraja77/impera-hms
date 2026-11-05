<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fixes SQLSTATE[01000] 1265 "Data truncated for column 'status'".
     *
     * consultations.status was created as ENUM('in_progress','consulted','completed'),
     * but the application inserts and queries 'pending' (ReceptionistController and
     * DoctorController). 'pending' is not in the enum, so MySQL truncates the value
     * (warning 1265 locally; hard insert failure under strict SQL mode in production).
     *
     * Extend the enum to include 'pending' and repair any rows that were previously
     * truncated to '' by the old definition.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('consultations', 'status')) {
            return;
        }

        DB::statement(
            'ALTER TABLE consultations '
            . 'MODIFY COLUMN status '
            . "ENUM('pending','in_progress','consulted','completed') "
            . "NOT NULL DEFAULT 'in_progress'"
        );

        // Repair rows that were corrupted to '' (or any invalid value) by the old enum.
        // Valid rows (in_progress/consulted/completed, and now pending) are untouched.
        DB::statement(
            'UPDATE consultations '
            . "SET status = 'pending' "
            . "WHERE status IS NULL OR status = '' "
            . "OR status NOT IN ('pending','in_progress','consulted','completed')"
        );
    }

    public function down(): void
    {
        if (! Schema::hasColumn('consultations', 'status')) {
            return;
        }

        DB::statement(
            'ALTER TABLE consultations '
            . 'MODIFY COLUMN status '
            . "ENUM('in_progress','consulted','completed') "
            . "NOT NULL DEFAULT 'in_progress'"
        );
    }
};
