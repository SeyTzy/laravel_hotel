<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRoomRequest;
use App\Http\Requests\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
use App\Models\Room;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class RoomController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $query = Room::query();

        if ($search = $request->string('search')) {
            $query->where('room_number', 'like', "%{$search}%");
        }

        if ($request->filled('room_type')) {
            $query->where('room_type', $request->string('room_type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('price_min')) {
            $query->where('price_per_night', '>=', (float) $request->input('price_min'));
        }

        if ($request->filled('price_max')) {
            $query->where('price_per_night', '<=', (float) $request->input('price_max'));
        }

        $sortBy = $request->string('sort_by', 'room_number')->toString();
        $sortDir = $request->string('sort_dir', 'asc')->toString();
        $sortDir = in_array($sortDir, ['asc', 'desc']) ? $sortDir : 'asc';
        $query->orderBy($sortBy, $sortDir);

        $rooms = $request->boolean('all', false)
            ? $query->get()
            : $query->paginate($request->integer('per_page', 9));

        return $this->successResponse('Rooms retrieved successfully', RoomResource::collection($rooms)->response($request)->getData(true));
    }

    public function store(StoreRoomRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('rooms', 'public');
        }

        $room = Room::create($data);

        return $this->successResponse('Room created successfully', new RoomResource($room), 201);
    }

    public function show(Room $room): JsonResponse
    {
        return $this->successResponse('Room retrieved successfully', new RoomResource($room->load('bookings')));
    }

    public function update(UpdateRoomRequest $request, Room $room): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            if ($room->image) {
                Storage::disk('public')->delete($room->image);
            }
            $data['image'] = $request->file('image')->store('rooms', 'public');
        }

        $room->update($data);

        return $this->successResponse('Room updated successfully', new RoomResource($room));
    }

    public function destroy(Room $room): JsonResponse
    {
        if ($room->bookings()->whereIn('booking_status', ['Pending', 'Confirmed', 'Checked In'])->exists()) {
            return $this->errorResponse('Cannot delete this room because it has active bookings.', 409);
        }

        if ($room->image) {
            Storage::disk('public')->delete($room->image);
        }

        $room->delete();

        return $this->successResponse('Room deleted successfully', null, 200);
    }
}
