<?php

namespace App\Http\Requests;

use App\Models\Booking;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'booking_code' => ['nullable', 'string', 'max:30', Rule::unique('bookings', 'booking_code')],
            'guest_id' => ['required', 'integer', 'exists:guests,id'],
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'check_in' => ['required', 'date'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'number_of_guests' => ['required', 'integer', 'min:1', 'max:10'],
            'payment_status' => ['required', Rule::in(Booking::PAYMENT_STATUSES)],
            'booking_status' => ['required', Rule::in(Booking::STATUSES)],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
            'special_request' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $data = $this->validated();

            $room = \App\Models\Room::find($data['room_id'] ?? null);
            if ($room && ($data['number_of_guests'] ?? 0) > $room->capacity) {
                $validator->errors()->add('number_of_guests', "This room only accommodates {$room->capacity} guest(s).");
            }

            if (! empty($data['room_id']) && ! empty($data['check_in']) && ! empty($data['check_out'])
                && ! Booking::isRoomAvailable($data['room_id'], $data['check_in'], $data['check_out'])) {
                $validator->errors()->add('room_id', 'This room is already booked during the selected dates.');
            }
        });
    }
}
