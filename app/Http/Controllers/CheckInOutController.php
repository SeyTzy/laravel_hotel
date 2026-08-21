<?php

namespace App\Http\Controllers;

use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\Room;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckInOutController extends Controller
{
    use ApiResponseTrait;

    public function today(): JsonResponse
    {
        $today = now()->toDateString();

        $checkIns = Booking::with(['guest', 'room'])
            ->whereDate('check_in', $today)
            ->whereNotIn('booking_status', ['Checked Out', 'Cancelled'])
            ->orderBy('check_in')->get();

        $checkOuts = Booking::with(['guest', 'room'])
            ->whereDate('check_out', $today)
            ->whereIn('booking_status', ['Confirmed', 'Checked In'])
            ->orderBy('check_out')->get();

        return $this->successResponse('Today\'s arrivals and departures', [
            'check_ins' => BookingResource::collection($checkIns),
            'check_outs' => BookingResource::collection($checkOuts),
        ]);
    }

    public function checkIn(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->booking_status === 'Checked In') {
            return $this->errorResponse('Guest is already checked in.', 409);
        }

        if (! in_array($booking->booking_status, ['Confirmed', 'Pending'])) {
            return $this->errorResponse('Only pending or confirmed bookings can be checked in.', 409);
        }

        if ($booking->check_in->isFuture()) {
            return $this->errorResponse('Check-in date has not arrived yet.', 422);
        }

        $booking->update(['booking_status' => 'Checked In']);

        if ($booking->room) {
            $booking->room->update(['status' => 'Occupied']);
        }

        return $this->successResponse('Guest checked in successfully', new BookingResource($booking->load(['guest', 'room', 'payments'])));
    }

    public function checkOut(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->booking_status !== 'Checked In') {
            return $this->errorResponse('Guest must be checked in before checking out.', 409);
        }

        $booking->update(['booking_status' => 'Checked Out']);

        $room = $booking->room;
        if ($room) {
            $hasActive = Room::find($room->id)->bookings()
                ->where('id', '!=', $booking->id)
                ->whereIn('booking_status', ['Pending', 'Confirmed', 'Checked In'])
                ->whereDate('check_in', '<=', now()->toDateString())
                ->whereDate('check_out', '>=', now()->toDateString())
                ->exists();

            $room->update(['status' => $hasActive ? 'Occupied' : 'Available']);
        }

        return $this->successResponse('Guest checked out successfully', new BookingResource($booking->load(['guest', 'room', 'payments'])));
    }
}
