<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(['email' => 'admin@staysphere.com'], [
            'name' => 'StaySphere Admin',
            'email' => 'admin@staysphere.com',
            'password' => Hash::make('admin123'),
            'is_admin' => true,
        ]);

        $this->call([
            RoomSeeder::class,
            GuestSeeder::class,
            BookingSeeder::class,
            PaymentSeeder::class,
            ServiceSeeder::class,
        ]);
    }
}
