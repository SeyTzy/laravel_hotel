<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            ['Breakfast', 'Fresh daily buffet breakfast with local and international dishes, served in our sky lounge.', 12],
            ['Airport Pickup', 'Private chauffeured airport transfer in a luxury vehicle with meet-and-greet service.', 25],
            ['Laundry', 'Same-day laundry, dry cleaning, and ironing service for all your garments.', 8],
            ['Spa', 'Relaxing full-body massage and aromatherapy treatment by certified therapists.', 45],
            ['Restaurant', 'Award-winning fine dining experience featuring Cambodian and continental cuisine.', 30],
            ['Room Service', '24-hour in-room dining with a curated menu delivered straight to your door.', 5],
            ['Swimming Pool', 'Access to our heated infinity pool and poolside bar with panoramic skyline views.', 15],
            ['Gym Access', 'Fully equipped 24-hour fitness center with personal trainer on request.', 10],
        ];

        foreach ($services as $i => [$name, $description, $price]) {
            $key = strtolower(str_replace(' ', '-', $name));
            Service::create([
                'service_name' => $name,
                'description' => $description,
                'price' => $price,
                'status' => $i === 7 ? 'inactive' : 'active',
                'image' => "services/{$key}.svg",
            ]);
        }
    }
}
