<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Guest;
use App\Models\Room;
use App\Models\Payment;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    use ApiResponseTrait;

    public function index(): JsonResponse
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();

        $stats = [
            'total_rooms' => Room::count(),
            'available_rooms' => Room::where('status', 'Available')->count(),
            'occupied_rooms' => Room::where('status', 'Occupied')->count(),
            'reserved_rooms' => Room::where('status', 'Reserved')->count(),
            'maintenance_rooms' => Room::where('status', 'Maintenance')->count(),
            'total_guests' => Guest::count(),
            'active_bookings' => Booking::whereIn('booking_status', ['Pending', 'Confirmed', 'Checked In'])->count(),
            'total_bookings' => Booking::count(),
            'today_check_ins' => Booking::whereDate('check_in', $today)
                ->whereNotIn('booking_status', ['Checked Out', 'Cancelled'])->count(),
            'today_check_outs' => Booking::whereDate('check_out', $today)
                ->whereIn('booking_status', ['Confirmed', 'Checked In'])->count(),
            'monthly_revenue' => (float) Payment::whereBetween('payment_date', [$monthStart, $today])
                ->where('payment_status', '!=', 'Refunded')->sum('amount'),
            'occupancy_rate' => $this->occupancyRate(),
        ];

        return $this->successResponse('Dashboard statistics retrieved successfully', $stats);
    }

    public function charts(): JsonResponse
    {
        $now = now();

        $monthlyRevenue = collect(range(0, 11))->map(function ($i) use ($now) {
            $month = $now->copy()->subMonths(11 - $i);

            return [
                'month' => $month->format('M Y'),
                'revenue' => (float) Payment::whereBetween('payment_date', [$month->copy()->startOfMonth()->toDateString(), $month->copy()->endOfMonth()->toDateString()])
                    ->where('payment_status', '!=', 'Refunded')->sum('amount'),
            ];
        });

        $bookingsByMonth = collect(range(0, 11))->map(function ($i) use ($now) {
            $month = $now->copy()->subMonths(11 - $i);

            return [
                'month' => $month->format('M Y'),
                'bookings' => Booking::whereBetween('check_in', [$month->copy()->startOfMonth()->toDateString(), $month->copy()->endOfMonth()->toDateString()])->count(),
            ];
        });

        $occupancy = collect(range(0, 11))->map(function ($i) use ($now) {
            $month = $now->copy()->subMonths(11 - $i);

            return [
                'month' => $month->format('M Y'),
                'rate' => $this->monthlyOccupancyRate($month->copy()),
            ];
        });

        $statusDistribution = collect(Booking::STATUSES)->map(function ($status) {
            return [
                'status' => $status,
                'count' => Booking::where('booking_status', $status)->count(),
            ];
        });

        return $this->successResponse('Chart data retrieved successfully', [
            'monthly_revenue' => $monthlyRevenue,
            'bookings_by_month' => $bookingsByMonth,
            'occupancy_rate' => $occupancy,
            'status_distribution' => $statusDistribution,
        ]);
    }

    private function occupancyRate(): float
    {
        $total = Room::count();
        if ($total === 0) {
            return 0;
        }

        $occupied = Room::whereIn('status', ['Occupied', 'Reserved'])->count();

        return round(($occupied / $total) * 100, 2);
    }

    private function monthlyOccupancyRate($month): float
    {
        $total = Room::count();
        if ($total === 0) {
            return 0;
        }

        $occupied = Booking::where('booking_status', '!=', 'Cancelled')
            ->where('check_in', '<=', $month->copy()->endOfMonth()->toDateString())
            ->where('check_out', '>=', $month->copy()->startOfMonth()->toDateString())
            ->distinct('room_id')->count('room_id');

        return round(($occupied / $total) * 100, 2);
    }
}
