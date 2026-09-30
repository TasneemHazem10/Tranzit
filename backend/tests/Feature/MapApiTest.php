<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MapApiTest extends TestCase
{
    use DatabaseMigrations;

    // ── Forward geocoding ──────────────────────────────────────

    public function test_geocode_search_proxies_nominatim(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/search*' => Http::response([
                [
                    'place_id' => 1,
                    'osm_id' => 'O1',
                    'name' => 'Cairo Tower',
                    'lat' => '30.0444',
                    'lon' => '31.2357',
                    'address' => ['city' => 'Cairo', 'country' => 'Egypt'],
                ],
            ]),
        ]);

        $res = $this->getJson('/api/v1/geocode/search?q=Cairo+Tower&lang=en');

        $res->assertOk()
            ->assertJsonPath('places.0.address', 'Cairo Tower, Cairo, Egypt')
            ->assertJsonPath('places.0.lat', 30.0444)
            ->assertJsonPath('places.0.lng', 31.2357);
    }

    public function test_geocode_search_falls_back_to_egypt_bias(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/search*' => function ($request) {
                $query = [];
                parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);
                $q = $query['q'] ?? '';

                if (stripos($q, 'Egypt') !== false) {
                    return Http::response([
                        [
                            'place_id' => 2,
                            'name' => 'Zamalek Tower',
                            'lat' => '30.06',
                            'lon' => '31.22',
                            'address' => ['suburb' => 'Zamalek', 'city' => 'Cairo'],
                        ],
                    ]);
                }

                return Http::response([]);
            },
        ]);

        $res = $this->getJson('/api/v1/geocode/search?q=Zamalek&lang=en');

        $res->assertOk()
            ->assertJsonPath('places.0.address', 'Zamalek Tower, Zamalek, Cairo')
            ->assertJsonPath('places.0.lat', 30.06);
    }

    // ── Reverse geocoding ──────────────────────────────────────

    public function test_geocode_reverse_returns_address(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'place_id' => 1,
                'display_name' => '10 Tahrir Square, Cairo, Egypt',
                'address' => ['city' => 'Cairo', 'country' => 'Egypt'],
            ]),
        ]);

        $res = $this->getJson('/api/v1/geocode/reverse?lat=30.0444&lng=31.2357&lang=ar');

        $res->assertOk()
            ->assertJsonPath('address', '10 Tahrir Square, Cairo, Egypt')
            ->assertJsonPath('lat', 30.0444)
            ->assertJsonPath('lng', 31.2357);
    }

    public function test_geocode_reverse_missing_coordinates_fails(): void
    {
        Http::fake(['nominatim.openstreetmap.org/*' => Http::response([])]);

        $res = $this->getJson('/api/v1/geocode/reverse?lat=30.0444');

        $res->assertStatus(422);
    }

    public function test_geocode_reverse_out_of_range_fails(): void
    {
        Http::fake(['nominatim.openstreetmap.org/*' => Http::response([])]);

        $this->getJson('/api/v1/geocode/reverse?lat=120&lng=31.2357')->assertStatus(422);
    }

    public function test_geocode_reverse_returns_empty_on_provider_failure(): void
    {
        Http::fake(['nominatim.openstreetmap.org/*' => Http::response('Server Error', 500)]);

        $res = $this->getJson('/api/v1/geocode/reverse?lat=30.0444&lng=31.2357');

        $res->assertOk()
            ->assertJsonPath('address', '')
            ->assertJsonPath('lat', 30.0444);
    }

    // ── Directions / routing ───────────────────────────────────

    public function test_directions_proxies_osrm(): void
    {
        Http::fake([
            'router.project-osrm.org/route/*' => Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 12500,
                    'duration' => 900,
                    'geometry' => [
                        'coordinates' => [[31.2357, 30.0444], [31.27, 30.07], [31.31, 30.1]],
                    ],
                ]],
            ]),
        ]);

        $res = $this->getJson('/api/v1/directions?from_lat=30.0444&from_lng=31.2357&to_lat=30.1&to_lng=31.31');

        $json = $res->json();

        $res->assertOk()
            ->assertJsonPath('distance_km', 12.5)
            ->assertJsonPath('route_source', 'osrm')
            ->assertJsonCount(3, 'polyline')
            ->assertJsonPath('polyline.0.latitude', 30.0444)
            ->assertJsonPath('polyline.0.longitude', 31.2357)
            ->assertJsonPath('polyline.2.latitude', 30.1);

        $this->assertEquals(15.0, $json['duration_min']);
    }

    public function test_directions_falls_back_to_straight_line_on_failure(): void
    {
        Http::fake([
            'router.project-osrm.org/route/*' => Http::response('Server Error', 500),
        ]);

        $res = $this->getJson('/api/v1/directions?from_lat=30.0&from_lng=31.0&to_lat=30.5&to_lng=31.5');

        $json = $res->json();

        $res->assertOk()
            ->assertJsonPath('route_source', 'straight_line')
            ->assertJsonCount(2, 'polyline')
            ->assertJsonPath('duration_min', null);

        $this->assertEquals(30.0, $json['polyline'][0]['latitude']);
        $this->assertEquals(31.0, $json['polyline'][0]['longitude']);
        $this->assertEquals(30.5, $json['polyline'][1]['latitude']);
        $this->assertEquals(31.5, $json['polyline'][1]['longitude']);
    }
}