<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Room;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        [$start, $end] = $this->resolveRange($request->string('period', 'this_month')->toString(), $request);

        $bookings = Booking::whereBetween('check_in', [$start, $end])->orWhereBetween('check_out', [$start, $end]);

        $payments = Payment::whereBetween('payment_date', [$start, $end])
            ->where('payment_status', '!=', 'Refunded');

        $totalRevenue = (float) (clone $payments)->sum('amount');
        $totalBookings = (clone $bookings)->count();

        $roomCount = Room::count();
        $occupiedNights = (clone $bookings)->whereIn('booking_status', ['Confirmed', 'Checked In', 'Checked Out'])
            ->get()->sum(fn ($b) => $b->number_of_nights);
        $availableNights = $roomCount * $start->diffInDays($end);
        $occupancyRate = $availableNights > 0 ? round(($occupiedNights / $availableNights) * 100, 2) : 0;

        $mostBookedRooms = Room::withCount([
            'bookings' => fn ($q) => $q->whereBetween('check_in', [$start, $end]),
        ])->orderByDesc('bookings_count')->take(5)->get();

        $popularRoomTypes = Room::select('room_type')
            ->withCount([
                'bookings' => fn ($q) => $q->whereBetween('check_in', [$start, $end]),
            ])
            ->orderByDesc('bookings_count')->get()
            ->groupBy('room_type')->map(fn ($group) => [
                'room_type' => $group->first()->room_type,
                'bookings' => $group->sum('bookings_count'),
            ])->values()->take(6);

        $paymentStats = collect(Payment::METHODS)->map(function ($method) use ($start, $end) {
            return [
                'method' => $method,
                'amount' => (float) Payment::where('payment_method', $method)
                    ->where('payment_status', '!=', 'Refunded')
                    ->whereBetween('payment_date', [$start, $end])->sum('amount'),
                'count' => Payment::where('payment_method', $method)
                    ->whereBetween('payment_date', [$start, $end])->count(),
            ];
        });

        $dailyRevenue = collect(range(0, min(30, $start->diffInDays($end))))->map(function ($i) use ($start) {
            $day = $start->copy()->addDays($i);

            return [
                'date' => $day->toDateString(),
                'revenue' => (float) Payment::whereDate('payment_date', $day)
                    ->where('payment_status', '!=', 'Refunded')->sum('amount'),
            ];
        });

        return $this->successResponse('Report generated successfully', [
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'total_revenue' => $totalRevenue,
            'total_bookings' => $totalBookings,
            'occupancy_rate' => $occupancyRate,
            'most_booked_rooms' => $mostBookedRooms->map(fn ($r) => [
                'id' => $r->id,
                'room_number' => $r->room_number,
                'room_type' => $r->room_type,
                'bookings' => $r->bookings_count,
            ]),
            'popular_room_types' => $popularRoomTypes,
            'payment_statistics' => $paymentStats,
            'daily_revenue' => $dailyRevenue,
        ]);
    }

    private function resolveRange(string $period, Request $request): array
    {
        if ($period === 'custom' && $request->filled(['date_from', 'date_to'])) {
            $start = \Carbon\Carbon::parse($request->string('date_from'));
            $end = \Carbon\Carbon::parse($request->string('date_to'));
        } else {
            [$start, $end] = match ($period) {
                'today' => [now()->startOfDay(), now()->endOfDay()],
                'this_week' => [now()->startOfWeek(), now()->endOfWeek()],
                'this_month' => [now()->startOfMonth(), now()->endOfMonth()],
                'this_year' => [now()->startOfYear(), now()->endOfYear()],
                default => [now()->startOfMonth(), now()->endOfMonth()],
            };
        }

        if ($end->lt($start)) {
            [$start, $end] = [$end, $start];
        }

        return [$start, $end];
    }
}
