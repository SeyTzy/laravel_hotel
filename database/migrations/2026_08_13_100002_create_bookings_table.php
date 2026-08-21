<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_code')->unique();
            $table->foreignId('guest_id')->constrained('guests')->cascadeOnDelete();
            $table->foreignId('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->date('check_in');
            $table->date('check_out');
            $table->unsignedTinyInteger('number_of_guests')->default(1);
            $table->enum('payment_status', ['Unpaid', 'Partial', 'Paid', 'Refunded'])->default('Unpaid');
            $table->enum('booking_status', ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled'])->default('Pending');
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->text('special_request')->nullable();
            $table->timestamps();

            $table->index(['check_in', 'check_out']);
            $table->index('booking_status');
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
