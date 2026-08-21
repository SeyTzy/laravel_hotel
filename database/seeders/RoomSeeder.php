<?php

namespace Database\Seeders;

use App\Models\Room;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        $configs = [
            ['type' => 'Single', 'floors' => [1, 2], 'price' => 35, 'capacity' => 1],
            ['type' => 'Double', 'floors' => [1, 2], 'price' => 55, 'capacity' => 2],
            ['type' => 'Twin', 'floors' => [2, 3], 'price' => 60, 'capacity' => 2],
            ['type' => 'Deluxe', 'floors' => [3, 4], 'price' => 85, 'capacity' => 3],
            ['type' => 'Suite', 'floors' => [4, 5], 'price' => 140, 'capacity' => 4],
            ['type' => 'Presidential', 'floors' => [5], 'price' => 320, 'capacity' => 6],
        ];

        $roomNumber = 1;
        $created = 0;

        while ($created < 20) {
            foreach ($configs as $config) {
                if ($created >= 20) {
                    break;
                }

                foreach ($config['floors'] as $floor) {
                    if ($created >= 20) {
                        break 2;
                    }

                    Room::create([
                        'room_number' => sprintf('%d%02d', $floor, $roomNumber),
                        'room_type' => $config['type'],
                        'floor' => (string) $floor,
                        'price_per_night' => $config['price'] + ($floor * 2),
                        'capacity' => $config['capacity'],
                        'description' => $this->description($config['type']),
                        'status' => 'Available',
                        'image' => "rooms/{$config['type']}.svg",
                    ]);

                    $roomNumber++;
                    $created++;
                }
            }
        }
    }

    private function description(string $type): string
    {
        return match ($type) {
            'Single' => 'A cozy, well-appointed single room perfect for business travelers, featuring a plush single bed and modern amenities.',
            'Double' => 'A spacious room with a comfortable double bed, ideal for couples, complete with city views and premium linens.',
            'Twin' => 'Two comfortable twin beds in a bright room, great for friends or colleagues traveling together.',
            'Deluxe' => 'An upgraded deluxe experience with a king bed, seating area, and panoramic views of the city skyline.',
            'Suite' => 'A refined suite with a separate living area, luxurious furnishings, and exclusive lounge access.',
            'Presidential' => 'The ultimate in luxury — a grand residence with a private dining area, butler service, and breathtaking views.',
            default => 'A beautifully appointed room at StaySphere.',
        };
    }
}
