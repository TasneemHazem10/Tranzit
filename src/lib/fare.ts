export type VehicleKey = 'trike' | 'mini' | 'pickup' | 'car';

export type VehicleRate = {
  bands: readonly [number, number, number, number];
};

/**
 * 2026 inDrive-style transport pricing (EGP).
 * Price = progressive distance bands + estimated travel time.
 * Bands are 0-50, 50-100, 100-200, and 200+ km.
 */
export const VEHICLE_RATES: Record<VehicleKey, VehicleRate> = {
  trike: { bands: [25, 18, 15, 5] },
  mini: { bands: [30, 23, 20, 10] },
  pickup: { bands: [40, 33, 28, 15] },
  car: { bands: [50, 43, 38, 25] },
};

export const VEHICLE_ORDER: VehicleKey[] = ['car', 'pickup', 'mini', 'trike'];

export function isVehicleKey(v: string): v is VehicleKey {
  return v === 'trike' || v === 'mini' || v === 'pickup' || v === 'car';
}

/** Map our client vehicle to the backend's accepted vehicle_type. */
export function vehicleToBackend(v: VehicleKey): 'trike' | 'small_car' | 'van' | 'truck' {
  switch (v) {
    case 'trike':
      return 'trike';
    case 'mini':
      return 'small_car';
    case 'pickup':
      return 'van';
    case 'car':
      return 'truck';
  }
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earth = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export type TripFare = {
  distanceKm: number;
  durationMin: number;
  price: number;
  routeSource: 'osrm' | 'straight_line';
};

/**
 * Distance & time come from the actual road route (OSRM via the Laravel
 * proxy). If routing is unavailable we fall back to a great-circle line
 * approximated at ~30 km/h so the user still gets an estimate.
 */
export function computeTripFare(
  vehicle: VehicleKey,
  distanceKm: number,
  durationMin: number | null
): TripFare {
  const time = durationMin != null ? durationMin : (distanceKm / 30) * 60;
  const rate = VEHICLE_RATES[vehicle];
  const firstBand = Math.min(distanceKm, 50);
  const secondBand = Math.min(Math.max(distanceKm - 50, 0), 50);
  const thirdBand = Math.min(Math.max(distanceKm - 100, 0), 100);
  const fourthBand = Math.max(distanceKm - 200, 0);
  const distanceCharge =
    firstBand * rate.bands[0] +
    secondBand * rate.bands[1] +
    thirdBand * rate.bands[2] +
    fourthBand * rate.bands[3];
  const timeCharge = time * (distanceKm > 200 ? 4 : 10);
  const raw = distanceCharge + timeCharge;
  return {
    distanceKm,
    durationMin: Math.round(time),
    price: Math.max(20, Math.round(raw)),
    routeSource: durationMin != null ? 'osrm' : 'straight_line',
  };
}

export function adjustBid(price: number, direction: 'increase' | 'decrease'): number {
  return Math.max(20, Math.round(price * (direction === 'increase' ? 1.04 : 0.96)));
}

/** Returns an integer minute count for display; the UI picks the locale wording. */
export function minutesRounded(min: number): number {
  return Math.max(1, Math.round(min));
}