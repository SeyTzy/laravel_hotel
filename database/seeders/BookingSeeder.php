<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Guest;
use App\Models\Room;
use App\Services\BookingService;
use Illuminate\Database\Seeder;

class BookingSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(BookingService::class);

        $guests = Guest::pluck('id')->all();
        $rooms = Room::pluck('id')->all();

        $definitions = [
            // [days_ago_start, nights, status]
            [0, 3, 'Checked In'],
            [0, 2, 'Checked In'],
            [1, 4, 'Checked In'],
            [1, 2, 'Confirmed'],
            [2, 5, 'Checked In'],
            [3, 2, 'Checked In'],
            [3, 1, 'Checked Out'],
            [5, 3, 'Checked Out'],
            [6, 2, 'Checked Out'],
            [7, 4, 'Checked Out'],
            [8, 2, 'Checked Out'],
            [10, 3, 'Checked Out'],
            [12, 2, 'Checked Out'],
            [15, 5, 'Checked Out'],
            [18, 3, 'Cancelled'],
            [-2, 3, 'Confirmed'],
            [-4, 4, 'Confirmed'],
            [-6, 2, 'Pending'],
            [-1, 5, 'Confirmed'],
            [-9, 3, 'Pending'],
            [-11, 2, 'Confirmed'],
            [-13, 4, 'Pending'],
        ];

        $usedRooms = [];

        foreach ($definitions as $i => [$daysAgo, $nights, $status]) {
            $checkIn = now()->subDays($daysAgo)->toDateString();
            $checkOut = now()->subDays($daysAgo)->addDays($nights)->toDateString();

            $availableRoom = Room::where('id', $rooms[array_rand($rooms)])
                ->where(function ($q) use ($checkIn, $checkOut, $usedRooms) {
                    $q->whereDoesntHave('bookings', function ($b) use ($checkIn, $checkOut) {
                        $b->whereIn('booking_status', ['Pending', 'Confirmed', 'Checked In'])
                            ->where(function ($bb) use ($checkIn, $checkOut) {
                                $bb->whereBetween('check_in', [$checkIn, $checkOut])
                                    ->orWhereBetween('check_out', [$checkIn, $checkOut]);
                            });
                    });
                })->first();

            if (! $availableRoom) {
                continue;
            }

            $usedRooms[] = $availableRoom->id;

            $guestId = $guests[array_rand($guests)];

            Booking::create([
                'booking_code' => $service->generateBookingCode(),
                'guest_id' => $guestId,
                'room_id' => $availableRoom->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'number_of_guests' => min($availableRoom->capacity, rand(1, $availableRoom->capacity)),
                'payment_status' => $status === 'Cancelled' ? 'Refunded' : 'Paid',
                'booking_status' => $status,
                'total_amount' => $service->calculateTotal($availableRoom, $checkIn, $checkOut),
                'special_request' => $i % 4 === 0 ? 'Please prepare a welcome fruit basket on arrival.' : null,
            ]);
        }

        // Sync room statuses to current reality
        Room::query()->update(['status' => 'Available']);

        foreach (Booking::whereIn('booking_status', ['Checked In'])->with('room')->get() as $booking) {
            $booking->room->update(['status' => 'Occupied']);
        }

        foreach (Booking::whereIn('booking_status', ['Confirmed', 'Pending'])
            ->whereDate('check_in', '<=', now()->toDateString())
            ->whereDate('check_out', '>=', now()->toDateString())
            ->with('room')->get() as $booking) {
            if ($booking->room->status === 'Available') {
                $booking->room->update(['status' => 'Reserved']);
            }
        }
    }
}
