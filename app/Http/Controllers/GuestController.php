<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGuestRequest;
use App\Http\Requests\UpdateGuestRequest;
use App\Http\Resources\GuestResource;
use App\Models\Guest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GuestController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $query = Guest::query();

        if ($search = $request->string('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('gender')) {
            $query->where('gender', $request->string('gender'));
        }

        if ($request->filled('nationality')) {
            $query->where('nationality', $request->string('nationality'));
        }

        $guests = $request->boolean('all', false)
            ? $query->orderBy('created_at', 'desc')->get()
            : $query->orderBy('created_at', 'desc')->paginate($request->integer('per_page', 10));

        return $this->successResponse('Guests retrieved successfully', GuestResource::collection($guests)->response($request)->getData(true));
    }

    public function store(StoreGuestRequest $request): JsonResponse
    {
        $guest = Guest::create($request->validated());

        return $this->successResponse('Guest created successfully', new GuestResource($guest), 201);
    }

    public function show(Guest $guest): JsonResponse
    {
        return $this->successResponse('Guest retrieved successfully', new GuestResource($guest->load('bookings')));
    }

    public function update(UpdateGuestRequest $request, Guest $guest): JsonResponse
    {
        $guest->update($request->validated());

        return $this->successResponse('Guest updated successfully', new GuestResource($guest));
    }

    public function destroy(Guest $guest): JsonResponse
    {
        $guest->delete();

        return $this->successResponse('Guest deleted successfully', null, 200);
    }
}
