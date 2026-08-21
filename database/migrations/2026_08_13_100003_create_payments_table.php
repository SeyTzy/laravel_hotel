<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->enum('payment_method', ['Cash', 'Credit Card', 'ABA', 'ACLEDA', 'Wing', 'Bank Transfer']);
            $table->decimal('amount', 10, 2);
            $table->date('payment_date');
            $table->enum('payment_status', ['Unpaid', 'Partial', 'Paid', 'Refunded'])->default('Paid');
            $table->string('transaction_reference')->nullable();
            $table->timestamps();

            $table->index(['payment_date', 'payment_method']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
