<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->text('symptoms')->nullable()->after('doctor_id');
            $table->string('temperature')->nullable()->after('symptoms');
            $table->string('blood_pressure')->nullable()->after('temperature');
            $table->string('heart_rate')->nullable()->after('blood_pressure');
            $table->dateTime('appointment_time')->nullable()->after('next_appointment');
            $table->foreignId('created_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
        });

        // ── Legacy data migration (safe on fresh installs) ──
        // Older databases stored visit data directly on the `patients` table;
        // schemas created after the visit/consultation split never had those
        // columns. Only run the copy + cleanup when the legacy columns actually
        // exist, so `migrate` from scratch works on every environment.
        $patientsHaveLegacyVisitColumns = Schema::hasColumns('patients', [
            'symptoms', 'temperature', 'blood_pressure', 'heart_rate',
        ]);

        if ($patientsHaveLegacyVisitColumns) {
            $patients = DB::table('patients')
                ->whereNotNull('symptoms')
                ->orWhereNotNull('temperature')
                ->orWhereNotNull('blood_pressure')
                ->orWhereNotNull('heart_rate')
                ->get();

            foreach ($patients as $patient) {
                $consultation = DB::table('consultations')
                    ->where('patient_id', $patient->id)
                    ->first();

                if ($consultation) {
                    DB::table('consultations')
                        ->where('id', $consultation->id)
                        ->update([
                            'symptoms' => $patient->symptoms,
                            'temperature' => $patient->temperature,
                            'blood_pressure' => $patient->blood_pressure,
                            'heart_rate' => $patient->heart_rate,
                            'appointment_time' => $patient->appointment_time,
                            'created_by' => $patient->created_by,
                        ]);
                } else {
                    // Patient has visit data but no consultation yet — create one
                    DB::table('consultations')->insert([
                        'patient_id' => $patient->id,
                        'doctor_id' => $patient->doctor_id,
                        'symptoms' => $patient->symptoms,
                        'temperature' => $patient->temperature,
                        'blood_pressure' => $patient->blood_pressure,
                        'heart_rate' => $patient->heart_rate,
                        'appointment_time' => $patient->appointment_time,
                        'created_by' => $patient->created_by,
                        'status' => $patient->status === 'completed' ? 'completed' : 'in_progress',
                        'created_at' => $patient->created_at,
                        'updated_at' => $patient->updated_at,
                    ]);
                }
            }
        }

        // Remove any visit-level columns still present on patients (legacy
        // databases have all of them; fresh installs only ever gained
        // `appointment_time` from the earlier family/appointment migration).
        $columnsToDrop = array_values(array_filter(
            ['symptoms', 'temperature', 'blood_pressure', 'heart_rate', 'appointment_time'],
            fn (string $column) => Schema::hasColumn('patients', $column),
        ));

        if ($columnsToDrop !== []) {
            Schema::table('patients', function (Blueprint $table) use ($columnsToDrop) {
                $table->dropColumn($columnsToDrop);
            });
        }
    }

    public function down(): void
    {
        // Re-add columns to patients
        Schema::table('patients', function (Blueprint $table) {
            $table->text('symptoms')->nullable()->after('phone');
            $table->string('temperature')->nullable()->after('symptoms');
            $table->string('blood_pressure')->nullable()->after('temperature');
            $table->string('heart_rate')->nullable()->after('blood_pressure');
            $table->dateTime('appointment_time')->nullable()->after('status');
        });

        // Migrate consultation data back to patients (best-effort)
        $consultations = DB::table('consultations')
            ->whereNotNull('symptoms')
            ->orWhereNotNull('temperature')
            ->orWhereNotNull('blood_pressure')
            ->orWhereNotNull('heart_rate')
            ->get();

        foreach ($consultations as $consultation) {
            DB::table('patients')
                ->where('id', $consultation->patient_id)
                ->update([
                    'symptoms' => $consultation->symptoms,
                    'temperature' => $consultation->temperature,
                    'blood_pressure' => $consultation->blood_pressure,
                    'heart_rate' => $consultation->heart_rate,
                    'appointment_time' => $consultation->appointment_time,
                ]);
        }

        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn(['symptoms', 'temperature', 'blood_pressure', 'heart_rate', 'appointment_time', 'created_by']);
        });
    }
};
