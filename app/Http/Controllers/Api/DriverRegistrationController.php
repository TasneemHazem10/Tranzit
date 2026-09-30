<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DriverRegistrationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'min:3'],
            'phone' => ['required', 'string', 'regex:/^[0-9+\s-]{8,15}$/', 'unique:drivers,phone'],
            'national_id' => ['required', 'string', 'digits_between:10,20', 'unique:drivers,national_id'],
            'vehicle_type' => ['required', 'string'],
            'vehicle_model' => ['required', 'string', 'max:255'],
            'vehicle_year' => ['required', 'string', 'digits:4'],
            'vehicle_plate' => ['required', 'string', 'max:20'],
            'vehicle_capacity' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'license' => ['required', 'image', 'max:5120'],
            'national_id_doc' => ['required', 'image', 'max:5120'],
            'insurance' => ['nullable', 'image', 'max:5120'],
            'registration' => ['nullable', 'image', 'max:5120'],
        ]);

        $data = [
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'national_id' => $validated['national_id'],
            'vehicle_type' => $validated['vehicle_type'],
            'vehicle_model' => $validated['vehicle_model'],
            'vehicle_year' => $validated['vehicle_year'],
            'vehicle_plate' => $validated['vehicle_plate'],
            'vehicle_capacity' => $validated['vehicle_capacity'] ?? null,
            'approval_status' => 'pending',
        ];

        if (!empty($validated['password'])) {
            $data['password'] = $validated['password'];
        }

        if ($request->hasFile('photo')) {
            $data['photo_url'] = $request->file('photo')->store('drivers/photos', 'public');
        }
        if ($request->hasFile('license')) {
            $data['license_path'] = $request->file('license')->store('drivers/licenses', 'public');
        }
        if ($request->hasFile('national_id_doc')) {
            $data['national_id_path'] = $request->file('national_id_doc')->store('drivers/ids', 'public');
        }
        if ($request->hasFile('insurance')) {
            $data['insurance_path'] = $request->file('insurance')->store('drivers/insurance', 'public');
        }
        if ($request->hasFile('registration')) {
            $data['registration_path'] = $request->file('registration')->store('drivers/registration', 'public');
        }

        $driver = Driver::create($data);

        return response()->json([
            'message' => 'تم إرسال بياناتك بنجاح، في انتظار المراجعة.',
            'driver' => $driver,
        ], 201);
    }
}
