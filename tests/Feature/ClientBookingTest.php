<?php

namespace Tests\Feature;

use App\Models\Room;
use Tests\TestCase;

class ClientBookingTest extends TestCase
{
    public function test_can_list_client_rooms(): void
    {
        $response = $this->getJson('/api/v1/client/rooms');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_can_list_featured_rooms(): void
    {
        $response = $this->getJson('/api/v1/client/rooms/featured');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_can_list_services(): void
    {
        $response = $this->getJson('/api/v1/client/services');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_can_create_and_lookup_booking(): void
    {
        $room = Room::where('status', '!=', 'Maintenance')->first();
        if (! $room) {
            $this->markTestSkipped('No rooms available in database.');
        }

        $offset = rand(300, 600);
        $checkIn = now()->addDays($offset)->toDateString();
        $checkOut = now()->addDays($offset + 2)->toDateString();

        $bookingData = [
            'room_id' => $room->id,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'number_of_guests' => 1,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john.doe@test.com',
            'phone' => '+85512345678',
            'nationality' => 'Cambodian',
            'payment_method' => 'ABA',
            'special_request' => 'Quiet room please',
        ];

        $response = $this->postJson('/api/v1/client/bookings', $bookingData);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $bookingCode = $response->json('data.booking_code');
        $this->assertNotEmpty($bookingCode);

        // Test Lookup
        $lookupResponse = $this->getJson("/api/v1/client/bookings/{$bookingCode}");
        $lookupResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.booking_code', $bookingCode)
            ->assertJsonPath('data.guest.email', 'john.doe@test.com');
    }
}
