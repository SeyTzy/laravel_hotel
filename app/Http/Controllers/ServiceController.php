<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreServiceRequest;
use App\Http\Requests\UpdateServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class ServiceController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request): JsonResponse
    {
        $query = Service::query();

        if ($search = $request->string('search')) {
            $query->where('service_name', 'like', "%{$search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $services = $request->boolean('all', false)
            ? $query->orderBy('service_name')->get()
            : $query->orderBy('service_name')->paginate($request->integer('per_page', 9));

        return $this->successResponse('Services retrieved successfully', ServiceResource::collection($services)->response($request)->getData(true));
    }

    public function store(StoreServiceRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('services', 'public');
        }

        $service = Service::create($data);

        return $this->successResponse('Service created successfully', new ServiceResource($service), 201);
    }

    public function show(Service $service): JsonResponse
    {
        return $this->successResponse('Service retrieved successfully', new ServiceResource($service));
    }

    public function update(UpdateServiceRequest $request, Service $service): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            if ($service->image) {
                Storage::disk('public')->delete($service->image);
            }
            $data['image'] = $request->file('image')->store('services', 'public');
        }

        $service->update($data);

        return $this->successResponse('Service updated successfully', new ServiceResource($service));
    }

    public function destroy(Service $service): JsonResponse
    {
        if ($service->image) {
            Storage::disk('public')->delete($service->image);
        }

        $service->delete();

        return $this->successResponse('Service deleted successfully', null, 200);
    }
}
