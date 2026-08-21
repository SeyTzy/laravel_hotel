<?php

namespace Database\Seeders;

use App\Models\Guest;
use Illuminate\Database\Seeder;

class GuestSeeder extends Seeder
{
    public function run(): void
    {
        $guests = [
            ['Sok', 'Kim', 'sok.kim@example.com', '+855 12 345 678', 'Male', '1990-03-15', 'Cambodian', 'Phnom Penh, Cambodia', 'ID-0001'],
            ['Chan', 'Sreymom', 'chan.sreymom@example.com', '+855 17 223 344', 'Female', '1992-07-22', 'Cambodian', 'Siem Reap, Cambodia', 'ID-0002'],
            ['John', 'Smith', 'john.smith@example.com', '+1 415 555 0132', 'Male', '1985-11-02', 'American', 'San Francisco, USA', 'ID-0003'],
            ['Maria', 'Garcia', 'maria.garcia@example.com', '+34 612 345 678', 'Female', '1994-01-30', 'Spanish', 'Madrid, Spain', 'ID-0004'],
            ['Yuki', 'Tanaka', 'yuki.tanaka@example.com', '+81 90 1234 5678', 'Female', '1998-05-18', 'Japanese', 'Tokyo, Japan', 'ID-0005'],
            ['Jean', 'Dupont', 'jean.dupont@example.com', '+33 6 12 34 56 78', 'Male', '1988-09-09', 'French', 'Paris, France', 'ID-0006'],
            ['Anna', 'Müller', 'anna.muller@example.com', '+49 151 2345 6789', 'Female', '1991-12-25', 'German', 'Berlin, Germany', 'ID-0007'],
            ['David', 'Lee', 'david.lee@example.com', '+65 9123 4567', 'Male', '1983-04-11', 'Singaporean', 'Singapore', 'ID-0008'],
            ['Sophea', 'Chea', 'sophea.chea@example.com', '+855 98 765 432', 'Female', '1996-08-05', 'Cambodian', 'Battambang, Cambodia', 'ID-0009'],
            ['Michael', 'Brown', 'michael.brown@example.com', '+44 7700 900123', 'Male', '1979-06-28', 'British', 'London, UK', 'ID-0010'],
            ['Linh', 'Nguyen', 'linh.nguyen@example.com', '+84 903 456 789', 'Female', '1995-02-14', 'Vietnamese', 'Hanoi, Vietnam', 'ID-0011'],
            ['Carlos', 'Ramirez', 'carlos.ramirez@example.com', '+52 55 1234 5678', 'Male', '1987-10-01', 'Mexican', 'Mexico City, Mexico', 'ID-0012'],
            ['Emily', 'Clark', 'emily.clark@example.com', '+61 412 345 678', 'Female', '1993-03-03', 'Australian', 'Sydney, Australia', 'ID-0013'],
            ['Ahmed', 'Hassan', 'ahmed.hassan@example.com', '+971 50 123 4567', 'Male', '1984-07-19', 'Emirati', 'Dubai, UAE', 'ID-0014'],
            ['Srey', 'Leak', 'srey.leak@example.com', '+855 15 888 999', 'Female', '2000-11-27', 'Cambodian', 'Kampong Cham, Cambodia', 'ID-0015'],
        ];

        foreach ($guests as $guest) {
            Guest::updateOrCreate(['email' => $guest[2]], [
                'first_name' => $guest[0],
                'last_name' => $guest[1],
                'phone' => $guest[3],
                'gender' => $guest[4],
                'date_of_birth' => $guest[5],
                'nationality' => $guest[6],
                'address' => $guest[7],
                'identity_number' => $guest[8],
            ]);
        }
    }
}
