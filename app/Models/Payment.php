<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'payment_method',
        'amount',
        'payment_date',
        'payment_status',
        'transaction_reference',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public const METHODS = ['Cash', 'Credit Card', 'ABA', 'ACLEDA', 'Wing', 'Bank Transfer'];

    public const STATUSES = ['Unpaid', 'Partial', 'Paid', 'Refunded'];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
