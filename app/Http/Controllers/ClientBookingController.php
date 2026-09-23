<?php

namespace App\Http\Controllers;

use App\Http\Resources\BookingResource;
use App\Http\Resources\RoomResource;
use App\Http\Resources\ServiceResource;
use App\Models\Booking;
use App\Models\Guest;
use App\Models\Payment;
use App\Models\Room;
use App\Models\Service;
use App\Services\BookingService;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ClientBookingController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly BookingService $bookingService)
    {
    }

    /**
     * Get rooms with optional search, type filter, price range, and date availability.
     */
    public function rooms(Request $request): JsonResponse
    {
        $query = Room::query();

        $bookedRoomIds = collect();
        if ($request->filled('check_in') && $request->filled('check_out')) {
            $checkIn = $request->string('check_in')->toString();
            $checkOut = $request->string('check_out')->toString();

            $bookedRoomIds = Booking::whereIn('booking_status', ['Pending', 'Confirmed', 'Checked In'])
                ->where(function ($q) use ($checkIn, $checkOut) {
                    $q->whereBetween('check_in', [$checkIn, $checkOut])
                        ->orWhereBetween('check_out', [$checkIn, $checkOut])
                        ->orWhere(function ($sub) use ($checkIn, $checkOut) {
                            $sub->where('check_in', '<=', $checkIn)->where('check_out', '>=', $checkOut);
                        });
                })
                ->pluck('room_id');

            // Only exclude if explicitly requested
            if ($request->boolean('only_available', false)) {
                $query->whereNotIn('id', $bookedRoomIds);
            }
        }

        // Room type filter
        if ($request->filled('room_type') && ! in_array($request->string('room_type')->toString(), ['All', ''])) {
            $query->where('room_type', $request->string('room_type'));
        }

        // Capacity filter
        if ($request->filled('guests') && $request->integer('guests') > 0) {
            $query->where('capacity', '>=', $request->integer('guests'));
        }

        // Floor filter
        if ($request->filled('floor') && ! in_array($request->string('floor')->toString(), ['All', ''])) {
            $query->where('floor', $request->string('floor'));
        }

        // Status filter
        if ($request->filled('status') && ! in_array($request->string('status')->toString(), ['All', ''])) {
            $query->where('status', $request->string('status'));
        }

        // Price range
        if ($request->filled('price_min')) {
            $query->where('price_per_night', '>=', (float) $request->input('price_min'));
        }
        if ($request->filled('price_max')) {
            $query->where('price_per_night', '<=', (float) $request->input('price_max'));
        }

        // Search by room number, type, or description
        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('room_number', 'like', "%{$search}%")
                    ->orWhere('room_type', 'like', "%{$search}%")
                    ->orWhere('floor', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Exclude Maintenance rooms by default unless requested
        if (! $request->boolean('include_maintenance', false)) {
            $query->where('status', '!=', 'Maintenance');
        }

        $sortBy = $request->string('sort_by', 'room_number')->toString();
        $sortDir = $request->string('sort_dir', 'asc')->toString();
        $sortDir = in_array(strtolower($sortDir), ['asc', 'desc']) ? strtolower($sortDir) : 'asc';

        if (in_array($sortBy, ['price_per_night', 'capacity', 'floor', 'room_number'])) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('room_number', 'asc');
        }

        $rooms = $query->get();

        $hasDates = $request->filled('check_in') && $request->filled('check_out');
        $nights = $hasDates
            ? max(1, (int) Carbon::parse($request->check_in)->diffInDays(Carbon::parse($request->check_out)))
            : 1;

        $rooms->each(function (Room $room) use ($nights, $bookedRoomIds, $hasDates) {
            $room->setAttribute('nights', $nights);
            $room->setAttribute('total_price', round($room->price_per_night * $nights, 2));

            if ($hasDates) {
                $isBooked = $bookedRoomIds->contains($room->id);
                $room->setAttribute('is_available', ! $isBooked);
            } else {
                $room->setAttribute('is_available', $room->status === 'Available');
            }
        });

        return $this->successResponse('Rooms retrieved successfully', RoomResource::collection($rooms));
    }

    /**
     * Featured rooms for the showcase section.
     */
    public function featuredRooms(): JsonResponse
    {
        $rooms = Room::where('status', '!=', 'Maintenance')
            ->whereIn('room_type', ['Suite', 'Presidential', 'Deluxe'])
            ->limit(6)
            ->get();

        if ($rooms->count() < 3) {
            $rooms = Room::where('status', '!=', 'Maintenance')->limit(6)->get();
        }

        return $this->successResponse('Featured rooms retrieved successfully', RoomResource::collection($rooms));
    }

    /**
     * Single room details.
     */
    public function showRoom(int $id): JsonResponse
    {
        $room = Room::findOrFail($id);

        return $this->successResponse('Room retrieved successfully', new RoomResource($room));
    }

    /**
     * Active hotel amenities & services.
     */
    public function services(): JsonResponse
    {
        $services = Service::where('status', 'active')->get();

        return $this->successResponse('Services retrieved successfully', ServiceResource::collection($services));
    }

    /**
     * Customer public booking creation.
     */
    public function storeBooking(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'check_in' => ['required', 'date', 'after_or_equal:today'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'number_of_guests' => ['required', 'integer', 'min:1', 'max:10'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['required', 'string', 'max:50'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'identity_number' => ['nullable', 'string', 'max:100'],
            'special_request' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['nullable', 'string', 'in:Cash,Credit Card,ABA,ACLEDA,Wing,Bank Transfer'],
        ]);

        $room = Room::findOrFail($validated['room_id']);

        // Check room capacity
        if ($validated['number_of_guests'] > $room->capacity) {
            return $this->errorResponse("This room accommodates a maximum of {$room->capacity} guests.", 422);
        }

        // Check room availability
        if (! Booking::isRoomAvailable($room->id, $validated['check_in'], $validated['check_out'])) {
            return $this->errorResponse('This room has just been reserved for the selected dates. Please choose different dates or another room.', 409);
        }

        return DB::transaction(function () use ($validated, $room, $request) {
            // Find or create guest
            $guest = Guest::firstOrNew(['email' => strtolower(trim($validated['email']))]);
            $guest->first_name = trim($validated['first_name']);
            $guest->last_name = trim($validated['last_name']);
            $guest->phone = trim($validated['phone']);
            if (! empty($validated['nationality'])) {
                $guest->nationality = trim($validated['nationality']);
            }
            if (! empty($validated['identity_number'])) {
                $guest->identity_number = trim($validated['identity_number']);
            }
            if (! $guest->gender) {
                $guest->gender = 'Other';
            }
            $guest->save();

            // Calculate total amount
            $totalAmount = $this->bookingService->calculateTotal($room, $validated['check_in'], $validated['check_out']);
            $bookingCode = $this->bookingService->generateBookingCode();

            $paymentMethod = $validated['payment_method'] ?? 'Cash';
            $isPaidOnline = in_array($paymentMethod, ['ABA', 'ACLEDA', 'Wing', 'Credit Card']);
            $paymentStatus = $isPaidOnline ? 'Paid' : 'Unpaid';

            // Create booking
            $booking = Booking::create([
                'booking_code' => $bookingCode,
                'guest_id' => $guest->id,
                'room_id' => $room->id,
                'check_in' => $validated['check_in'],
                'check_out' => $validated['check_out'],
                'number_of_guests' => $validated['number_of_guests'],
                'booking_status' => 'Confirmed',
                'payment_status' => $paymentStatus,
                'total_amount' => $totalAmount,
                'special_request' => $validated['special_request'] ?? null,
            ]);

            // Record payment if online or selected
            if ($isPaidOnline || $paymentMethod === 'Cash') {
                Payment::create([
                    'booking_id' => $booking->id,
                    'payment_method' => $paymentMethod,
                    'amount' => $totalAmount,
                    'payment_date' => now()->toDateString(),
                    'payment_status' => $paymentStatus,
                    'transaction_reference' => 'TXN-' . strtoupper(Str::random(10)),
                ]);
            }

            // Sync room status
            $this->syncRoomStatus($booking);

            $loaded = $booking->load(['guest', 'room', 'payments']);

            return $this->successResponse('Reservation confirmed successfully!', new BookingResource($loaded), 201);
        });
    }

    /**
     * Public booking lookup by booking code.
     */
    public function lookupBooking(string $code): JsonResponse
    {
        $code = trim(strtoupper($code));

        $booking = Booking::with(['guest', 'room', 'payments'])
            ->where('booking_code', $code)
            ->first();

        if (! $booking) {
            return $this->errorResponse('Booking not found with confirmation code: ' . $code, 404);
        }

        return $this->successResponse('Booking retrieved successfully', new BookingResource($booking));
    }

    /**
     * Public booking cancellation.
     */
    public function cancelBooking(Request $request, string $code): JsonResponse
    {
        $code = trim(strtoupper($code));

        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $booking = Booking::with(['guest', 'room'])
            ->where('booking_code', $code)
            ->first();

        if (! $booking) {
            return $this->errorResponse('Booking not found with confirmation code: ' . $code, 404);
        }

        if (strtolower($booking->guest->email) !== strtolower(trim($validated['email']))) {
            return $this->errorResponse('The email address does not match this booking record.', 403);
        }

        if (in_array($booking->booking_status, ['Checked In', 'Checked Out'])) {
            return $this->errorResponse('Cannot cancel a booking that has already checked in or checked out.', 409);
        }

        if ($booking->booking_status === 'Cancelled') {
            return $this->errorResponse('This booking is already cancelled.', 400);
        }

        $booking->update([
            'booking_status' => 'Cancelled',
        ]);

        $this->syncRoomStatus($booking);

        return $this->successResponse('Booking cancelled successfully.', new BookingResource($booking->load(['guest', 'room', 'payments'])));
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
