<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Database\Seeder;

class PaymentSeeder extends Seeder
{
    public function run(): void
    {
        $methods = ['Cash', 'Credit Card', 'ABA', 'ACLEDA', 'Wing', 'Bank Transfer'];

        $bookings = Booking::whereNotIn('booking_status', ['Cancelled'])->with('payments')->get();

        foreach ($bookings as $booking) {
            $total = (float) $booking->total_amount;

            if ($booking->booking_status === 'Pending') {
                $this->makePayment($booking, $methods, round($total * 0.3, 2), $booking->check_in->copy()->subDays(rand(1, 5)), 'Partial');
                continue;
            }

            if (rand(1, 5) === 5) {
                $this->makePayment($booking, $methods, round($total / 2, 2), $booking->check_in->copy()->subDays(rand(1, 5)), 'Partial');
                $this->makePayment($booking, $methods, round($total - ($total / 2), 2), $booking->check_out, 'Paid');
            } else {
                $this->makePayment($booking, $methods, $total, $booking->check_in->copy()->subDays(rand(0, 3)), 'Paid');
            }
        }

        foreach (Booking::where('booking_status', 'Cancelled')->get() as $booking) {
            $this->makePayment($booking, $methods, (float) $booking->total_amount, $booking->check_in->copy()->subDays(rand(1, 8)), 'Refunded');
        }
    }

    private function makePayment(Booking $booking, array $methods, float $amount, $date, string $status): void
    {
        Payment::create([
            'booking_id' => $booking->id,
            'payment_method' => $methods[array_rand($methods)],
            'amount' => max(0.01, $amount),
            'payment_date' => $date->toDateString(),
            'payment_status' => $status,
            'transaction_reference' => 'TXN-' . strtoupper(\Illuminate\Support\Str::random(10)),
        ]);
    }
}
