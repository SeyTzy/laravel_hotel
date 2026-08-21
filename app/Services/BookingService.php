<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Room;
use Illuminate\Support\Str;

class BookingService
{
    public function generateBookingCode(): string
    {
        do {
            $code = 'BK-' . strtoupper(Str::random(8));
        } while (Booking::where('booking_code', $code)->exists());

        return $code;
    }

    public function calculateTotal(Room $room, string $checkIn, string $checkOut): float
    {
        $nights = max(1, (int) \Carbon\Carbon::parse($checkIn)->diffInDays(\Carbon\Carbon::parse($checkOut)));

        return (float) round($room->price_per_night * $nights, 2);
    }
}
