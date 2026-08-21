<?php

namespace Database\Seeders;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Default Admin
        User::create([
            'name' => 'Admin',
            'email' => 'manmatharaja2003@gmail.com',
            'password' => Hash::make('Hardik7000m@'),
            'role' => 'admin',
            'phone' => '9999999999',
        ]);

        // Sample Doctors
        $doctors = [
            ['name' => 'Dr. Rajesh Kumar', 'email' => 'manmatharaja2004@gmail.com', 'specialization' => 'General Physician', 'phone' => '8888888881'],
            ['name' => 'Dr. Priya Sharma', 'email' => 'rajesh@hms.com', 'specialization' => 'Cardiologist', 'phone' => '8888888882'],
            ['name' => 'Dr. Amit Patel', 'email' => 'amit@hms.com', 'specialization' => 'Orthopedic', 'phone' => '8888888883'],
            ['name' => 'Dr. Sneha Reddy', 'email' => 'sneha@hms.com', 'specialization' => 'Pediatrician', 'phone' => '8888888884'],
        ];

        foreach ($doctors as $doc) {
            $user = User::create([
                'name' => $doc['name'],
                'email' => $doc['email'],
                'password' => Hash::make('Hardik7000m@'),
                'role' => 'doctor',
                'phone' => $doc['phone'],
            ]);

            Doctor::create([
                'user_id' => $user->id,
                'specialization' => $doc['specialization'],
                'phone' => $doc['phone'],
                'consultation_fee' => 500,
                'available_days' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                'available_from' => '09:00',
                'available_to' => '17:00',
            ]);
        }

        // Sample Receptionist
        User::create([
            'name' => 'Receptionist',
            'email' => 'manmatharaja2005@gmail.com',
            'password' => Hash::make('Hardik7000m@'),
            'role' => 'receptionist',
            'phone' => '7777777777',
        ]);
    }
}
