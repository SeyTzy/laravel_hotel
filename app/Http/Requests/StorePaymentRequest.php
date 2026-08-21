<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'booking_id' => ['required', 'integer', 'exists:bookings,id'],
            'payment_method' => ['required', Rule::in(\App\Models\Payment::METHODS)],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_date' => ['required', 'date'],
            'payment_status' => ['required', Rule::in(\App\Models\Payment::STATUSES)],
            'transaction_reference' => ['nullable', 'string', 'max:100'],
        ];
    }
}
