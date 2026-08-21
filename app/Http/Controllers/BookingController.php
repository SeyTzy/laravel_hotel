<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBookingRequest;
use App\Http\Requests\UpdateBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\Room;
use App\Services\BookingService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BookingController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly BookingService $bookingService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Booking::with(['guest', 'room', 'payments']);

        if ($search = $request->string('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('booking_code', 'like', "%{$search}%")
                    ->orWhereHas('guest', function ($g) use ($search) {
                        $g->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('room', function ($r) use ($search) {
                        $r->where('room_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('booking_status')) {
            $query->where('booking_status', $request->string('booking_status'));
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->string('payment_status'));
        }

        if ($request->filled('date_from')) {
            $query->where('check_in', '>=', $request->string('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('check_out', '<=', $request->string('date_to'));
        }

        $query->orderBy('check_in', 'desc');

        $bookings = $request->boolean('all', false)
            ? $query->get()
            : $query->paginate($request->integer('per_page', 10));

        return $this->successResponse('Bookings retrieved successfully', BookingResource::collection($bookings)->response($request)->getData(true));
    }

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $data = $request->validated();

        $room = Room::findOrFail($data['room_id']);
        $data['booking_code'] = $data['booking_code'] ?? $this->bookingService->generateBookingCode();
        $data['total_amount'] = $data['total_amount'] ?? $this->bookingService->calculateTotal($room, $data['check_in'], $data['check_out']);

        $booking = Booking::create($data);

        if (in_array($booking->booking_status, ['Confirmed', 'Checked In'])) {
            $this->syncRoomStatus($booking);
        }

        return $this->successResponse('Booking created successfully', new BookingResource($booking->load(['guest', 'room', 'payments'])), 201);
    }

    public function show(Booking $booking): JsonResponse
    {
        return $this->successResponse('Booking retrieved successfully', new BookingResource($booking->load(['guest', 'room', 'payments'])));
    }

    public function update(UpdateBookingRequest $request, Booking $booking): JsonResponse
    {
        $data = $request->validated();

        if (! empty($data['room_id'])) {
            $room = Room::findOrFail($data['room_id']);
            if (isset($data['total_amount']) && $data['total_amount'] <= 0) {
                $data['total_amount'] = $this->bookingService->calculateTotal($room, $data['check_in'], $data['check_out']);
            }
        }

        $booking->update($data);

        $this->syncRoomStatus($booking);

        return $this->successResponse('Booking updated successfully', new BookingResource($booking->load(['guest', 'room', 'payments'])));
    }

    public function destroy(Booking $booking): JsonResponse
    {
        if ($booking->booking_status === 'Checked In') {
            return $this->errorResponse('Cannot delete a checked-in booking. Check out the guest first.', 409);
        }

        $booking->delete();

        return $this->successResponse('Booking deleted successfully', null, 200);
    }

    private function syncRoomStatus(Booking $booking): void
    {
        $room = $booking->room;

        if (! $room) {
            return;
        }

        $active = Booking::where('room_id', $room->id)
            ->where('id', '!=', $booking->id)
            ->whereIn('booking_status', ['Pending', 'Confirmed', 'Checked In'])
            ->where(function ($q) {
                $q->whereDate('check_in', '<=', now()->toDateString())
                    ->whereDate('check_out', '>=', now()->toDateString());
            })
            ->exists();

        $status = match ($booking->booking_status) {
            'Checked In' => 'Occupied',
            'Checked Out', 'Cancelled' => $active ? $room->status : 'Available',
            'Confirmed' => 'Reserved',
            default => $room->status,
        };

        if ($status !== 'Occupied' && $active && $booking->booking_status !== 'Checked Out' && $booking->booking_status !== 'Cancelled') {
            $status = 'Reserved';
        }

        if ($room->status !== $status) {
            $room->update(['status' => $status]);
        }
    }
}
