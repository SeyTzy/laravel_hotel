<?php

namespace App\Http\Controllers;

use App\Http\Resources\RoomResource;
use App\Models\Booking;
use App\Models\Room;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'check_in' => ['required', 'date'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'guests' => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        $checkIn = $validated['check_in'];
        $checkOut = $validated['check_out'];
        $guests = (int) ($validated['guests'] ?? 1);

        $roomIds = Booking::whereIn('booking_status', ['Pending', 'Confirmed', 'Checked In'])
            ->where(function ($q) use ($checkIn, $checkOut) {
                $q->whereBetween('check_in', [$checkIn, $checkOut])
                    ->orWhereBetween('check_out', [$checkIn, $checkOut])
                    ->orWhere(function ($q) use ($checkIn, $checkOut) {
                        $q->where('check_in', '<=', $checkIn)->where('check_out', '>=', $checkOut);
                    });
            })
            ->pluck('room_id');

        $query = Room::where('status', '!=', 'Maintenance')
            ->whereNotIn('id', $roomIds);

        if ($request->filled('room_type')) {
            $query->where('room_type', $request->string('room_type'));
        }

        if ($request->filled('max_price')) {
            $query->where('price_per_night', '<=', (float) $request->input('max_price'));
        }

        $rooms = $query->where('capacity', '>=', $guests)
            ->orderBy('price_per_night')
            ->get();

        $nights = max(1, (int) \Carbon\Carbon::parse($checkIn)->diffInDays(\Carbon\Carbon::parse($checkOut)));

        $rooms->each(function (Room $room) use ($nights) {
            $room->setAttribute('total_price', round($room->price_per_night * $nights, 2));
            $room->setAttribute('nights', $nights);
        });

        return $this->successResponse('Available rooms retrieved successfully', [
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => $guests,
            'nights' => $nights,
            'rooms' => RoomResource::collection($rooms),
        ]);
    }
}
