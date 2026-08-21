<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePaymentRequest;
use App\Http\Requests\UpdatePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Booking;
use App\Models\Payment;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $query = Payment::with('booking.guest', 'booking.room');

        if ($search = $request->string('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('transaction_reference', 'like', "%{$search}%")
                    ->orWhereHas('booking', function ($b) use ($search) {
                        $b->where('booking_code', 'like', "%{$search}%")
                            ->orWhereHas('guest', function ($g) use ($search) {
                                $g->where('first_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%");
                            });
                    });
            });
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->string('payment_method'));
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->string('payment_status'));
        }

        if ($request->filled('date_from')) {
            $query->where('payment_date', '>=', $request->string('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('payment_date', '<=', $request->string('date_to'));
        }

        $query->orderBy('payment_date', 'desc');

        $payments = $request->boolean('all', false)
            ? $query->get()
            : $query->paginate($request->integer('per_page', 10));

        return $this->successResponse('Payments retrieved successfully', PaymentResource::collection($payments)->response($request)->getData(true));
    }

    public function store(StorePaymentRequest $request): JsonResponse
    {
        $data = $request->validated();

        $data['transaction_reference'] = $data['transaction_reference']
            ?? 'TXN-' . strtoupper(\Illuminate\Support\Str::random(10));

        $payment = Payment::create($data);

        $this->recalculateBookingPaymentStatus($payment->booking);

        return $this->successResponse('Payment recorded successfully', new PaymentResource($payment->load('booking')), 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        return $this->successResponse('Payment retrieved successfully', new PaymentResource($payment->load('booking')));
    }

    public function update(UpdatePaymentRequest $request, Payment $payment): JsonResponse
    {
        $payment->update($request->validated());

        $this->recalculateBookingPaymentStatus($payment->booking);

        return $this->successResponse('Payment updated successfully', new PaymentResource($payment->load('booking')));
    }

    public function destroy(Payment $payment): JsonResponse
    {
        $booking = $payment->booking;
        $payment->delete();

        if ($booking) {
            $this->recalculateBookingPaymentStatus($booking);
        }

        return $this->successResponse('Payment deleted successfully', null, 200);
    }

    private function recalculateBookingPaymentStatus(?Booking $booking): void
    {
        if (! $booking) {
            return;
        }

        $paid = (float) $booking->payments->where('payment_status', '!=', 'Refunded')->sum('amount');
        $total = (float) $booking->total_amount;

        $status = match (true) {
            $paid <= 0 => 'Unpaid',
            $paid < $total => 'Partial',
            $paid >= $total => 'Paid',
            default => 'Unpaid',
        };

        if ($booking->payment_status !== $status) {
            $booking->update(['payment_status' => $status]);
        }
    }
}
