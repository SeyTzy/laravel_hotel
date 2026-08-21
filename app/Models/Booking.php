<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_code',
        'guest_id',
        'room_id',
        'check_in',
        'check_out',
        'number_of_guests',
        'payment_status',
        'booking_status',
        'total_amount',
        'special_request',
    ];

    protected $casts = [
        'check_in' => 'date',
        'check_out' => 'date',
        'number_of_guests' => 'integer',
        'total_amount' => 'decimal:2',
    ];

    public const STATUSES = ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled'];

    public const PAYMENT_STATUSES = ['Unpaid', 'Partial', 'Paid', 'Refunded'];

    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getNumberOfNightsAttribute(): int
    {
        return max(1, $this->check_in->diffInDays($this->check_out));
    }

    public function getAmountPaidAttribute(): float
    {
        return (float) $this->payments->where('payment_status', '!=', 'Refunded')->sum('amount');
    }

    public static function isRoomAvailable(int $roomId, string $checkIn, string $checkOut, ?int $excludeBookingId = null): bool
    {
        $query = static::where('room_id', $roomId)
            ->whereIn('booking_status', ['Pending', 'Confirmed', 'Checked In'])
            ->where(function ($q) use ($checkIn, $checkOut) {
                $q->whereBetween('check_in', [$checkIn, $checkOut])
                    ->orWhereBetween('check_out', [$checkIn, $checkOut])
                    ->orWhere(function ($q) use ($checkIn, $checkOut) {
                        $q->where('check_in', '<=', $checkIn)
                            ->where('check_out', '>=', $checkOut);
                    });
            });

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        return $query->doesntExist();
    }
}
