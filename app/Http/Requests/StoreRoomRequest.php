<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'room_number' => ['required', 'string', 'max:20', Rule::unique('rooms', 'room_number')],
            'room_type' => ['required', Rule::in(\App\Models\Room::TYPES)],
            'floor' => ['required', 'string', 'max:20'],
            'price_per_night' => ['required', 'numeric', 'min:0.01'],
            'capacity' => ['required', 'integer', 'min:1', 'max:10'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', Rule::in(\App\Models\Room::STATUSES)],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
        ];
    }
}
