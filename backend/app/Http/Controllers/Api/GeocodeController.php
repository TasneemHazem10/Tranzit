<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GeocodeController extends Controller
{
    private const NOMINATIM = 'https://nominatim.openstreetmap.org';
    private const PHOTON = 'https://photon.komoot.io/api';
    private const GOOGLE_PLACES = 'https://places.googleapis.com/v1/places:searchText';
    private const OSRM = 'https://router.project-osrm.org';
    private const EGYPT_BBOX = '24.7,21.9,37.2,32.2';
    private const CAIRO_CENTER = ['lat' => 30.0444, 'lng' => 31.2357];

    /** Forward geocoding proxy (see search()). */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $lang = $request->query('lang', 'en') === 'ar' ? 'ar' : 'en';

        if ($q === '') {
            return response()->json(['places' => []]);
        }

        $places = $this->googlePlacesSearch($q, $lang);
        if (empty($places)) {
            $places = $this->photonSearch($q, $lang);
        }
        if (empty($places)) {
            $places = $this->nominatimSearch($q, $lang, 'eg');
        }

        return response()->json(['places' => array_slice($this->dedupe($places), 0, 8)]);
    }

    /**
     * Google Places API (New) "Text Search" — by far the most accurate
     * geocoder for detailed Egyptian locations (streets, districts, Arabic
     * names, landmarks). Enabled only when GOOGLE_PLACES_API_KEY is set in
     * .env; otherwise the OSM chain below keeps working automatically.
     */
    private function googlePlacesSearch(string $q, string $lang): array
    {
        $key = (string) config('services.google.places_api_key', '');
        if ($key === '') {
            return [];
        }

        $body = $this->httpPostJson(self::GOOGLE_PLACES, [
            'textQuery' => $q,
            'languageCode' => $lang === 'ar' ? 'ar' : 'en',
            'regionCode' => 'EG',
            'locationBias' => [
                'circle' => [
                    'center' => ['latitude' => self::CAIRO_CENTER['lat'], 'longitude' => self::CAIRO_CENTER['lng']],
                    'radius' => 250000.0,
                ],
            ],
            'maxResultCount' => 10,
        ], [
            'X-Goog-Api-Key' => $key,
            'X-Goog-FieldMask' => 'places.id,places.displayName.text,places.formattedAddress,places.location.latitude,places.location.longitude',
        ], 7);

        if ($body === null) {
            return [];
        }
        $json = json_decode($body, true);
        $rows = $json['places'] ?? [];
        if (! is_array($rows)) {
            return [];
        }

        $places = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $name = trim((string) ($row['displayName']['text'] ?? ''));
            $fmt = trim((string) ($row['formattedAddress'] ?? ''));
            $lat = $row['location']['latitude'] ?? null;
            $lng = $row['location']['longitude'] ?? null;
            if (! is_numeric($lat) || ! is_numeric($lng)) {
                continue;
            }
            $parts = array_values(array_filter([$name, $fmt], fn ($v) => $v !== ''));
            if ($parts === []) {
                continue;
            }
            $places[] = [
                'placeId' => 'g-' . (string) ($row['id'] ?? count($places)),
                'address' => implode(', ', $parts),
                'lat' => (float) $lat,
                'lng' => (float) $lng,
            ];
        }

        return $places;
    }

    private function photonSearch(string $q, string $lang): array
    {
        $params = [
            'q' => $q,
            'limit' => 10,
            'lat' => 30.0444,
            'lon' => 31.2357, // Cairo hint so Egypt is preferred
            'bbox' => self::EGYPT_BBOX,
        ];
        if ($lang === 'en') {
            $params['lang'] = 'en';
        }

        $body = $this->httpGet(self::PHOTON, $params, 7);
        if ($body === null) {
            return [];
        }
        $json = json_decode($body, true);
        if (! is_array($json)) {
            return [];
        }

        $places = [];
        foreach ($json['features'] ?? [] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $coords = $row['geometry']['coordinates'] ?? null;
            if (! is_array($coords) || count($coords) < 2) {
                continue;
            }
            $label = $this->photonLabel($row['properties'] ?? [], $lang);
            if ($label === '') {
                continue;
            }
            $places[] = [
                'placeId' => 'p-' . ($row['properties']['osm_id'] ?? count($places)),
                'address' => $label,
                'lat' => (float) $coords[1],
                'lng' => (float) $coords[0],
            ];
        }

        return $places;
    }

    private function nominatimSearch(string $q, string $lang, ?string $countryCodes = null): array
    {
        $params = [
            'q' => $q,
            'format' => 'jsonv2',
            'addressdetails' => 1,
            'limit' => 10,
            'dedupe' => 1,
            'accept-language' => $lang === 'ar' ? 'ar,en' : 'en,ar',
        ];
        if ($countryCodes !== null) {
            $params['countrycodes'] = $countryCodes;
        }

        $body = $this->httpGet(self::NOMINATIM . '/search', $params, 6);
        if ($body === null) {
            return [];
        }
        $rows = json_decode($body, true);
        if (! is_array($rows)) {
            return [];
        }

        $places = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $namePart = trim((string) ($row['name'] ?? ''));
            $address = is_array($row['address'] ?? null) ? $row['address'] : null;
            $scope = $address === null ? '' : $this->addressLabel($address, $lang);
            if ($scope === '') {
                $scope = (string) ($row['display_name'] ?? '');
            }
            $parts = array_values(array_filter([$namePart, $scope], fn ($v) => $v !== ''));
            if ($parts === []) {
                continue;
            }
            $places[] = [
                'placeId' => 'n-' . ($row['osm_id'] ?? $row['place_id'] ?? count($places)),
                'address' => implode(', ', $parts),
                'lat' => (float) ($row['lat'] ?? 0),
                'lng' => (float) ($row['lon'] ?? 0),
            ];
        }

        return $places;
    }

    private function photonLabel(array $props, string $lang): string
    {
        $street = '';
        if (isset($props['housenumber']) && $props['housenumber'] !== '') {
            $street = trim($props['housenumber'] . ' ' . ($props['street'] ?? ''));
        } elseif (isset($props['street']) && $props['street'] !== '') {
            $street = trim((string) $props['street']);
        }

        return $this->prettify([
            $props['name'] ?? null,
            $street,
            $props['district'] ?? null,
            $props['city'] ?? null,
            $props['state'] ?? null,
            $props['country'] ?? null,
        ], $lang);
    }

    private function prettify(array $parts, string $lang): string
    {
        $seen = [];
        $out = [];
        foreach ($parts as $part) {
            $value = $this->pick($part ?? null, $lang);
            if ($value === '' || in_array($value, $seen, true)) {
                continue;
            }
            $seen[] = $value;
            $out[] = $value;
        }

        return implode(', ', $out);
    }

    private function dedupe(array $places): array
    {
        $seen = [];
        $result = [];
        foreach ($places as $place) {
            $key = round($place['lat'], 3) . ',' . round($place['lng'], 3);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $result[] = $place;
        }

        return $result;
    }
    /**
     * Reverse geocoding proxy (used for "where am I?" / address previews).
     */
    public function reverse(Request $request): JsonResponse
    {
        $lat = $request->query('lat');
        $lng = $request->query('lng');
        $lang = $request->query('lang', 'en') === 'ar' ? 'ar' : 'en';

        if ($lat === null || $lng === null) {
            return response()->json(['message' => 'lat و lng مطلوبان.'], 422);
        }

        $lat = (float) $lat;
        $lng = (float) $lng;

        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            return response()->json(['message' => 'إحداثيات غير صالحة.'], 422);
        }

        $body = $this->httpGet(self::NOMINATIM . '/reverse', [
            'lat' => $lat,
            'lon' => $lng,
            'format' => 'jsonv2',
            'addressdetails' => 1,
            'accept-language' => $lang === 'ar' ? 'ar,en' : 'en,ar',
        ]);

        $row = json_decode($body ?? '', true);

        if (! is_array($row) || empty($row['display_name'])) {
            return response()->json(['address' => '', 'components' => [], 'lat' => $lat, 'lng' => $lng]);
        }

        return response()->json([
            'address' => (string) $row['display_name'],
            'components' => $this->addressLabel($row['address'] ?? null, $lang),
            'lat' => $lat,
            'lng' => $lng,
        ]);
    }

    /**
     * Driving directions (OSRM proxy). Returns a road-following polyline
     * with distance + duration; falls back to a straight great-circle line
     * when the routing service is unreachable.
     */
    public function directions(Request $request): JsonResponse
    {
        $fromLat = $request->query('from_lat');
        $fromLng = $request->query('from_lng');
        $toLat = $request->query('to_lat');
        $toLng = $request->query('to_lng');

        foreach ([$fromLat, $fromLng, $toLat, $toLng] as $value) {
            if ($value === null || ! is_numeric($value)) {
                return response()->json(['message' => 'from_lat, from_lng, to_lat, to_lng مطلوبة.'], 422);
            }
        }

        $fromLat = (float) $fromLat;
        $fromLng = (float) $fromLng;
        $toLat = (float) $toLat;
        $toLng = (float) $toLng;

        $fallback = fn (): JsonResponse => response()->json([
            'distance_km' => round(Shipment::distanceBetween($fromLat, $fromLng, $toLat, $toLng), 2),
            'duration_min' => null,
            'polyline' => [
                ['latitude' => $fromLat, 'longitude' => $fromLng],
                ['latitude' => $toLat, 'longitude' => $toLng],
            ],
            'route_source' => 'straight_line',
        ]);

        $body = $this->httpGet(self::OSRM . '/route/v1/driving/' . $fromLng . ',' . $fromLat . ';' . $toLng . ',' . $toLat, [
            'overview' => 'full',
            'geometries' => 'geojson',
            'steps' => 'false',
        ]);

        if ($body === null) {
            return $fallback();
        }

        $data = json_decode($body, true);
        if (! is_array($data) || ($data['code'] ?? '') !== 'Ok' || empty($data['routes'])) {
            return $fallback();
        }

        $route = $data['routes'][0];
        $coordinates = $route['geometry']['coordinates'] ?? [];
        $polyline = [];
        foreach ($coordinates as $coord) {
            if (! is_array($coord) || count($coord) < 2) {
                continue;
            }
            $polyline[] = [
                'latitude' => (float) $coord[1],
                'longitude' => (float) $coord[0],
            ];
        }

        if (empty($polyline)) {
            return $fallback();
        }

        return response()->json([
            'distance_km' => round((float) ($route['distance'] ?? 0) / 1000, 2),
            'duration_min' => round((float) ($route['duration'] ?? 0) / 60, 1),
            'polyline' => $polyline,
            'route_source' => 'osrm',
        ]);
    }

    
    /** Fetch a URL with a browser-ish User-Agent. Returns null on failure. */
    private function httpGet(string $url, array $query, int $timeout = 8): ?string
    {
        try {
            $response = Http::timeout($timeout)
                ->withHeaders([
                    'User-Agent' => 'TranzetApp/1.0 (mobile delivery app)',
                    'Accept' => 'application/json',
                ])
                ->get($url, $query);

            return $response->ok() ? $response->body() : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** POST a JSON payload with custom headers. Returns null on failure. */
    private function httpPostJson(string $url, array $payload, array $headers = [], int $timeout = 7): ?string
    {
        try {
            $response = Http::timeout($timeout)
                ->withHeaders(array_merge([
                    'User-Agent' => 'TranzetApp/1.0 (mobile delivery app)',
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ], $headers))
                ->post($url, $payload);

            return $response->ok() ? $response->body() : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function addressLabel(array $address, string $lang): string
    {
        if (empty($address)) {
            return '';
        }

        $keys = [
            'amenity', 'leisure', 'shop', 'building', 'house_number', 'road',
            'pedestrian', 'neighbourhood', 'suburb', 'city_district', 'county',
            'municipality', 'city', 'town', 'village', 'state', 'country',
        ];

        $seen = [];
        $parts = [];
        foreach ($keys as $key) {
            $value = $this->pick($address[$key] ?? null, $lang);
            if ($value !== '' && !in_array($value, $seen, true)) {
                $seen[] = $value;
                $parts[] = $value;
            }
        }

        return implode(', ', $parts);
    }

    private function pick($value, string $lang): string
    {
        if (is_string($value)) {
            return trim($value);
        }
        if (is_array($value)) {
            foreach ([$lang, 'en', 'ar', 'default', 'name'] as $key) {
                if (isset($value[$key]) && is_string($value[$key]) && trim($value[$key]) !== '') {
                    return trim($value[$key]);
                }
            }
        }

        return '';
    }
}