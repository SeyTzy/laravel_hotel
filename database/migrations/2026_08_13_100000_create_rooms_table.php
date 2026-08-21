<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('room_number')->unique();
            $table->enum('room_type', ['Single', 'Double', 'Twin', 'Deluxe', 'Suite', 'Presidential']);
            $table->string('floor');
            $table->decimal('price_per_night', 10, 2);
            $table->unsignedTinyInteger('capacity');
            $table->text('description')->nullable();
            $table->enum('status', ['Available', 'Occupied', 'Reserved', 'Maintenance'])->default('Available');
            $table->string('image')->nullable();
            $table->timestamps();

            $table->index(['status', 'room_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
