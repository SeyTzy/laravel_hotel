<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AvailabilityController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\CheckInOutController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ClientBookingController;
use App\Http\Controllers\GuestController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\ServiceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/avatar', [AuthController::class, 'updateAvatar']);
        });
    });

    Route::get('/availability', [AvailabilityController::class, 'index']);

    // Public Client API (For React user client website)
    Route::prefix('client')->group(function () {
        Route::get('/rooms', [ClientBookingController::class, 'rooms']);
        Route::get('/rooms/featured', [ClientBookingController::class, 'featuredRooms']);
        Route::get('/rooms/{id}', [ClientBookingController::class, 'showRoom']);
        Route::get('/services', [ClientBookingController::class, 'services']);
        Route::post('/bookings', [ClientBookingController::class, 'storeBooking']);
        Route::get('/bookings/{code}', [ClientBookingController::class, 'lookupBooking']);
        Route::post('/bookings/{code}/cancel', [ClientBookingController::class, 'cancelBooking']);
    });

    Route::middleware('auth:sanctum')->group(function () {

        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/dashboard/charts', [DashboardController::class, 'charts']);

        Route::get('/reports', [ReportController::class, 'index']);

        Route::get('/checkins-today', [CheckInOutController::class, 'today']);
        Route::post('/bookings/{booking}/check-in', [CheckInOutController::class, 'checkIn']);
        Route::post('/bookings/{booking}/check-out', [CheckInOutController::class, 'checkOut']);

        Route::apiResource('rooms', RoomController::class);
        Route::apiResource('guests', GuestController::class);
        Route::apiResource('bookings', BookingController::class);
        Route::apiResource('payments', PaymentController::class);
        Route::apiResource('services', ServiceController::class);
    });
});
