import { API_BASE_URL } from './client';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const PHOTON_URL = 'https://photon.komoot.io/api';

const SEARCH_TIMEOUT = 6000;
const REVERSE_TIMEOUT = 6000;

export type Place = {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
};

async function fetchJson(url: string, timeout = SEARCH_TIMEOUT): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function prettify(parts: (string | undefined | null)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const clean = part?.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out.join(', ');
}

/** Reads a localized string from a value that may be a string or a {lang: string} map. */
function pickLocale(value: any, lang: string): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const v = value.trim();
    return v || undefined;
  }
  if (typeof value === 'object') {
    const v = value[lang] ?? value.en ?? value.ar ?? value.default ?? value.name ?? value.road;
    if (typeof v === 'string') return v;
  }
  return undefined;
}

const ADDRESS_KEYS = [
  'amenity',
  'leisure',
  'shop',
  'building',
  'house_number',
  'road',
  'pedestrian',
  'neighbourhood',
  'suburb',
  'city_district',
  'county',
  'municipality',
  'city',
  'town',
  'village',
  'state',
  'country',
];

function addressLabel(address: any, lang: string): string {
  if (!address) return '';
  return prettify(ADDRESS_KEYS.map(key => pickLocale(address[key], lang)));
}

function isArabic(text: string): boolean {
  return /[\u0600-\u06ff]/.test(text);
}

// Photon rejects the `lang=ar` parameter with HTTP 400 and its OSM results are
// localized anyway, so `lang` is only sent for English clients.
const PHOTON_CAIRO_HINT = { lat: 30.0444, lon: 31.2357 };
const PHOTON_EGYPT_BBOX = [24.7, 21.9, 37.2, 32.2];

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_EGYPT_BBOX = '(22,24.5,31.8,37.2)';
const OVERPASS_TIMEOUT = 4500;

const POSITIVE_TTL = 3 * 60_000; // re-use found results for 3 minutes ...
const NEGATIVE_TTL = 20_000; // ... empty results for 20 seconds
const searchCache = new Map<string, { at: number; places: Place[] }>();

// ---- Query normalization for pasted share-addresses -----------------------

// Tokens that add noise to a business-name search (law offices, clinics, ...).
const FILLER_TOKENS = new Set([
  'مكتب', 'مكاتب', 'المستشار', 'المستشارين', 'الدكتور', 'دكتور',
  'محاماة', 'المحاماة', 'والمحاماة', 'للمحاماة', 'محامي', 'المحامي', 'محام', 'محامين',
  'استشارات', 'الاستشارات', 'والاستشارات', 'واستشارات', 'قانونية', 'القانونية', 'والقانونية',
  'ضريبية', 'الضريبية', 'والضريبية', 'شركة', 'وشركة', 'شركات', 'والشركات',
  'عقارية', 'والعقارية', 'صيدلية', 'والصيدلية', 'عيادة', 'وعيادة', 'عيادات',
  'مركز', 'ومركز', 'مؤسسة', 'ومؤسسة', 'للشحن', 'والشحن',
]);

const PLUS_CODE_RE = /\b[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/gi;
const POSTAL_RE = /\b\d{5,7}\b/g;

/** Strip plus codes + postal codes + Arabic diacritics, normalize commas/whitespace. */
function normalizeQuery(text: string): string {
  return text
    .replace(PLUS_CODE_RE, ' ')
    .replace(POSTAL_RE, ' ')
    .replace(/[\u064b-\u0652\u0670\u0640]/g, '')
    .replace(/\s*(?:,|،)\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^,|,$/g, '')
    .trim();
}

/** Business-name fragment: first segment with filler words removed. */
function nameFragment(text: string): string {
  const first = text.split(/(?:,|،)/)[0]?.trim() ?? '';
  const tokens = first.split(/\s+/).filter(t => !FILLER_TOKENS.has(t) && !/^\d+$/.test(t));
  return tokens.slice(0, 4).join(' ');
}

/** Area fragment: the last useful segment, minus country/governorate markers.
 *  Short area names (e.g. "Imbaba") search far better than long ones. */
function areaFragment(text: string): string {
  const parts = text.split(/(?:,|،)/).map(s => s.trim()).filter(Boolean);
  const meaningful = parts.filter(p => !/(governorate|governate|محافظة|مصر|egypt|country)$/i.test(p));
  return meaningful.length ? meaningful[meaningful.length - 1] : '';
}

/** Street fragment: segment after the last "-" (best street part), cleaned up. */
function streetFragment(text: string): string {
  const parts = text.split(/(?:,|،)/).map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return '';
  let seg = parts[1];
  if (seg.includes('-')) seg = seg.split('-').slice(-1)[0].trim();
  const tokens = seg.split(/\s+/).filter(t => !/^(nadi|club|الشارع|شارع|طريق|مدينة|المدينة)$/i.test(t) && !/^\d+$/.test(t));
  return tokens.slice(0, 3).join(' ');
}

/** Little helpers for Open Location Codes (Google "plus codes" in shared addresses). */
const OLC_ALPHABET = '23456789CFGHJMPQRVWX';

function olcEncode(lat: number, lng: number, len = 10): string {
  let la = Math.max(-90, Math.min(90, lat));
  let lo = lng;
  while (lo < -180) lo += 360;
  while (lo >= 180) lo -= 360;
  let latLo = -90, latHi = 90, lngLo = -180, lngHi = 180;
  let code = '';
  for (let i = 0; i < len / 2; i++) {
    const latRange = (latHi - latLo) / 20;
    let idx = Math.max(0, Math.min(19, Math.floor((la - latLo) / latRange)));
    code += OLC_ALPHABET[idx];
    latLo += idx * latRange;
    latHi = latLo + latRange;
    const lngRange = (lngHi - lngLo) / 20;
    idx = Math.max(0, Math.min(19, Math.floor((lo - lngLo) / lngRange)));
    code += OLC_ALPHABET[idx];
    lngLo += idx * lngRange;
    lngHi = lngLo + lngRange;
  }
  return code;
}

function olcDecode(code: string, refLat: number, refLng: number): { lat: number; lng: number } | null {
  try {
    const digits = code.toUpperCase().replace(/[^23456789CFGHJMPQRVWX]/g, '');
    if (digits.length < 2) return null;
    const plus = code.toUpperCase().indexOf('+');
    const prefixLen = plus === -1 ? digits.length : plus;
    let full = digits;
    if (prefixLen < 8) {
      full = olcEncode(refLat, refLng, 8).slice(0, 8 - prefixLen) + digits;
    }
    let latLo = -90, latHi = 90, lngLo = -180, lngHi = 180;
    for (let i = 0; i < full.length; i++) {
      const n = OLC_ALPHABET.indexOf(full[i]);
      if (n < 0) return null;
      if (i % 2 === 0) {
        const range = (latHi - latLo) / 20;
        latLo += n * range;
        latHi = latLo + range;
      } else {
        const range = (lngHi - lngLo) / 20;
        lngLo += n * range;
        lngHi = lngLo + range;
      }
    }
    return { lat: (latLo + latHi) / 2, lng: (lngLo + lngHi) / 2 };
  } catch {
    return null;
  }
}

function kmDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractPlusCode(text: string): string | null {
  const m = text.match(PLUS_CODE_RE);
  return m ? m[0].toUpperCase() : null;
}

function inEgypt(lat: number, lng: number): boolean {
  return lat > 22 && lat < 32 && lng > 24 && lng < 37;
}

/**
 * Turn a plus code into a pinned place, but ONLY when it can be trusted:
 * global codes decode by themselves; short codes (the common Google-Maps
 * share format) are padded with the reference point's block, so we only keep
 * the pin when it lands near the area anchor found via the text (otherwise a
 * short code is ambiguous across all of Egypt and could point anywhere).
 */
function plusCodePlace(query: string, anchor: Place | null, lang: 'ar' | 'en'): Place | null {
  const code = extractPlusCode(query);
  if (!code) return null;
  const digits = code.toUpperCase().replace(/[^23456789CFGHJMPQRVWX]/g, '');
  const plus = code.toUpperCase().indexOf('+');
  const prefixLen = plus === -1 ? digits.length : plus;
  // Short codes (2-6 chars before the +) are ambiguous across all of Egypt;
  // they can only be trusted when an area anchor pins the right block.
  if (prefixLen < 8 && !anchor) return null;
  const decoded = olcDecode(code, anchor?.lat ?? PHOTON_CAIRO_HINT.lat, anchor?.lng ?? PHOTON_CAIRO_HINT.lon);
  if (!decoded) return null;
  if (!inEgypt(decoded.lat, decoded.lng)) return null;
  if (anchor && kmDistance(anchor.lat, anchor.lng, decoded.lat, decoded.lng) > 35) return null;
  const label = nameFragment(normalizeQuery(query)) || normalizeQuery(query);
  return {
    placeId: `plus-${code.replace(/\+/g, '')}`,
    address: lang === 'ar' ? `${label} (من العنوان المنسوخ)` : `${label} (from shared location)`,
    lat: decoded.lat,
    lng: decoded.lng,
  };
}

// ---- Engine helpers -------------------------------------------------------

function cacheKey(q: string, lang: 'ar' | 'en') {
  return `${lang}:${q.toLowerCase()}`;
}

/** Merge lists, dropping places that land within ~100 m of each other, cap 8. */
function merged(...lists: Place[][]): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const list of lists) {
    for (const p of list) {
      const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
      if (out.length >= 8) return out;
    }
  }
  return out;
}

function containsAny(text: string, tokens: string[]): boolean {
  const low = text.toLowerCase();
  return tokens.some(t => t.length >= 3 && low.includes(t.toLowerCase()));
}

async function photonSearch(
  q: string,
  lang: 'ar' | 'en',
  hint: boolean,
  bbox?: number[],
): Promise<Place[]> {
  const params = new URLSearchParams({ q, limit: '10' });
  if (lang === 'en') params.set('lang', 'en');
  if (hint) {
    params.set('lat', String(PHOTON_CAIRO_HINT.lat));
    params.set('lon', String(PHOTON_CAIRO_HINT.lon));
  }
  if (bbox) params.set('bbox', bbox.join(','));
  const json: any = await fetchJson(`${PHOTON_URL}/?${params.toString()}`, SEARCH_TIMEOUT);
  const features: any[] = Array.isArray(json?.features) ? json.features : [];
  return features.slice(0, 10).map((f, i) => ({
    placeId: String(f.properties?.osm_id ?? i),
    address: prettify([
      f.properties?.name,
      f.properties?.street,
      f.properties?.district,
      f.properties?.city,
      f.properties?.state,
      f.properties?.country,
    ]),
    lat: Number(f.geometry?.coordinates?.[1] ?? 0),
    lng: Number(f.geometry?.coordinates?.[0] ?? 0),
  }));
}

async function nominatimSearch(q: string, lang: 'ar' | 'en', countryCodes?: string): Promise<Place[]> {
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '10',
    dedupe: '1',
    'accept-language': lang === 'ar' ? 'ar,en' : 'en,ar',
  });
  if (countryCodes) params.set('countrycodes', countryCodes);
  if (countryCodes === 'eg') {
    // Bound Egypt searches tightly so a detailed query can't match a
    // similarly-named place in another country.
    params.set('viewbox', '24.7,32.2,37.2,21.9');
    params.set('bounded', '1');
  }
  const json: any = await fetchJson(`${NOMINATIM_URL}/search?${params.toString()}`, SEARCH_TIMEOUT);
  const rows: any[] = Array.isArray(json) ? json : [];
  return rows.slice(0, 10).map((row, i) => {
    const scope = addressLabel(row.address, lang) || row.display_name || '';
    return {
      placeId: String(row.osm_id ?? row.place_id ?? i),
      address: prettify([row.name, scope]),
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lon),
    };
  });
}

/**
 * Nominatim structured search (street within city/district). Nominatim's
 * free-text `q` is famously weak; `street=` + `city=` pins the exact road in
 * Egypt and finds streets that free-text queries miss.
 */
async function nominatimStructured(
  street: string,
  area: string,
  lang: 'ar' | 'en'
): Promise<Place[]> {
  if (!street || !area || street.toLowerCase() === area.toLowerCase()) return [];
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    limit: '8',
    dedupe: '1',
    'accept-language': lang === 'ar' ? 'ar,en' : 'en,ar',
    street,
    city: area,
    countrycodes: 'eg',
  });
  const json: any = await fetchJson(`${NOMINATIM_URL}/search?${params.toString()}`, SEARCH_TIMEOUT);
  const rows: any[] = Array.isArray(json) ? json : [];
  return rows.slice(0, 8).map((row, i) => ({
    placeId: String(row.osm_id ?? row.place_id ?? i),
    address: prettify([row.name, addressLabel(row.address, lang) || row.display_name || '']),
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lon),
  }));
}

async function overpassSearch(pattern: string): Promise<Place[]> {
  const p = pattern.trim();
  if (p.length < 2) return [];
  const esc = p.replace(/[\\".*+?^${}()|[\]{}]/g, '\\$&');
  const clauses: string[] = [];
  for (const tag of ['name', 'name:ar']) {
    for (const type of ['node', 'way']) {
      clauses.push(`${type}["${tag}"~"${esc}",i]${OVERPASS_EGYPT_BBOX};`);
    }
  }
  const data = `[out:json][timeout:4];(${clauses.join('')});out center 8;`;
  const attempts = OVERPASS_URLS.map(async url => {
    const json: any = await fetchJson(`${url}?data=${encodeURIComponent(data)}`, OVERPASS_TIMEOUT);
    return (Array.isArray(json?.elements) ? json.elements : []).slice(0, 8).map((el: any, i: number) => {
      const tags = el.tags ?? {};
      const lat = el.type === 'node' ? Number(el.lat) : Number(el.center?.lat);
      const lng = el.type === 'node' ? Number(el.lon) : Number(el.center?.lon);
      return {
        placeId: `op-${el.type}-${el.id ?? i}`,
        address: prettify([tags['name:ar'] || tags.name || p, tags['addr:street'], tags['addr:city']]),
        lat,
        lng,
      };
    });
  });
  const settled = await Promise.allSettled(attempts);
  const merged: Place[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') merged.push(...r.value);
  }
  return merged.filter(p => p.address && Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

async function proxySearch(q: string, lang: 'ar' | 'en'): Promise<Place[]> {
  const url = `${API_BASE_URL}/api/v1/geocode/search?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`;
  const json: any = await fetchJson(url, SEARCH_TIMEOUT);
  const rows: any[] = Array.isArray(json?.places) ? json.places : [];
  return rows
    .filter(p => p?.address && Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
    .map(p => ({
      placeId: String(p.placeId ?? ''),
      address: String(p.address ?? ''),
      lat: Number(p.lat ?? 0),
      lng: Number(p.lng ?? 0),
    }));
}

/**
 * Forward geocoding ("search as you type") that handles real-world Egyptian
 * share-addresses: long pasted strings with a business name, street, district
 * and postal code. It splits the query into fragments (clean text, business
 * name without filler words, area words), runs every engine on them in
 * parallel, ranks hits near the area anchor first, and pins plus codes.
 */
export async function searchPlaces(query: string, lang: 'ar' | 'en' = 'en'): Promise<Place[]> {
  const q = query.trim();
  if (!q) return [];

  const key = cacheKey(q, lang);
  const hit = searchCache.get(key);
  if (hit) {
    const ttl = hit.places.length > 0 ? POSITIVE_TTL : NEGATIVE_TTL;
    if (Date.now() - hit.at < ttl) return hit.places;
    searchCache.delete(key);
  }

  const clean = normalizeQuery(q);

  const fragments: string[] = [];
  const pushFragment = (f: string) => {
    const t = f.trim();
    if (t && t !== clean && t.length >= 2 && !fragments.includes(t)) fragments.push(t);
  };
  const fName = clean ? nameFragment(clean) : '';
  const fArea = clean ? areaFragment(clean) : '';
  const fStreet = clean ? streetFragment(clean) : '';
  pushFragment(fName);
  pushFragment(fArea);
  pushFragment(fStreet);
  const fStreetArea = fStreet && fArea && fStreet !== fArea ? `${fStreet} ${fArea}` : '';
  pushFragment(fStreetArea);

  // Pasted share addresses (commas / plus codes / postal codes) warrant the
  // heavier Overpass name search. Run it in parallel so it never adds latency.
  const isPasted = /[،,]/.test(q) || POSTAL_RE.test(q) || PLUS_CODE_RE.test(q);

  const settled = await Promise.allSettled([
    proxySearch(clean, lang),
    ...fragments.slice(0, 4).map(f => photonSearch(f, lang, true, PHOTON_EGYPT_BBOX)),
    nominatimSearch(clean, lang, 'eg'),
    ...(fArea && fArea !== clean ? [nominatimSearch(fArea, lang, 'eg')] : []),
    ...(fStreet && fArea && fStreet !== fArea ? [nominatimStructured(fStreet, fArea, lang)] : []),
    ...(isPasted && fName ? [overpassSearch(fName)] : []),
  ]);
  const lists = settled.map(r => (r.status === 'fulfilled' ? r.value : []));
  let places = merged(...lists).slice(0, 8);

  // Anchor: the best match that mentions the area words of the query.
  const areaTokens = areaFragment(clean).split(/\s+/);
  const anchor = places.find(p => containsAny(p.address, areaTokens)) ?? null;

  if (anchor) {
    places.sort((a, b) => kmDistance(anchor.lat, anchor.lng, a.lat, a.lng) - kmDistance(anchor.lat, anchor.lng, b.lat, b.lng));
  }

  // Trusted plus-code pin (exact shared location) on top.
  const plus = plusCodePlace(query, anchor, lang);
  if (plus && !places.some(p => kmDistance(p.lat, p.lng, plus.lat, plus.lng) < 0.1)) {
    places.unshift(plus);
  }
  places = places.slice(0, 8);

  if (places.length === 0) {
    // Deep name search over OSM (Overpass, best-effort) before falling back
    // to a worldwide fuzzy search — catches detailed business names that exist
    // in OSM but that Photon's tokenized index cannot resolve.
    const op = await Promise.allSettled([overpassSearch(fName || clean)]);
    places = merged(...op.map(r => (r.status === 'fulfilled' ? r.value : []))).slice(0, 8);
    if (places.length === 0) {
      const suffix = isArabic(q) ? '، مصر' : 'Egypt';
      const stageB = await Promise.allSettled([
        photonSearch(`${q.replace(PLUS_CODE_RE, ' ').replace(/\s+/g, ' ').trim()} ${suffix}`, lang, true),
        nominatimSearch(q, lang),
      ]);
      places = merged(...stageB.map(r => (r.status === 'fulfilled' ? r.value : []))).slice(0, 8);
    }
  }

  if (searchCache.size >= 120) {
    const oldest = searchCache.keys().next().value as string | undefined;
    if (oldest) searchCache.delete(oldest);
  }
  searchCache.set(key, { at: Date.now(), places });
  return places;
}

/** Reverse geocode coordinates -> a readable, localized address. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  lang: 'ar' | 'en' = 'en'
): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
      'accept-language': lang === 'ar' ? 'ar,en' : 'en,ar',
    });
    const json: any = await fetchJson(`${NOMINATIM_URL}/reverse?${params.toString()}`, REVERSE_TIMEOUT);
    const label = addressLabel(json?.address, lang) || json?.display_name;
    if (label) return label;
  } catch {
    // fall through
  }

  try {
    // Photon rejects `lang=ar` (HTTP 400), so only ask for English labels.
    const pUrl =
      lang === 'en'
        ? `${PHOTON_URL}/reverse?lat=${lat}&lon=${lng}&lang=${lang}`
        : `${PHOTON_URL}/reverse?lat=${lat}&lon=${lng}`;
    const json: any = await fetchJson(pUrl, REVERSE_TIMEOUT);
    const p = json?.features?.[0]?.properties;
    if (p) {
      const label = prettify([
        p.name,
        p.street,
        p.district,
        p.city,
        p.state,
        p.country,
      ]);
      if (label) return label;
    }
  } catch {
    // fall through
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export type RoutePoint = { latitude: number; longitude: number };

export type DriverDirections = {
  distanceKm: number | null;
  durationMin: number | null;
  polyline: RoutePoint[];
  routeSource: 'osrm' | 'straight_line';
};

const DIRECTIONS_TIMEOUT = 12000;

/**
 * Driving directions via our Laravel OSRM proxy (/api/v1/directions).
 * The server returns a road-following polyline and already falls back to
 * a straight great-circle line when the routing service is unreachable.
 */
export async function fetchRoute(
  from: RoutePoint,
  to: RoutePoint,
  lang: 'ar' | 'en' = 'en'
): Promise<DriverDirections> {
  const params = new URLSearchParams({
    from_lat: String(from.latitude),
    from_lng: String(from.longitude),
    to_lat: String(to.latitude),
    to_lng: String(to.longitude),
    lang: lang === 'ar' ? 'ar' : 'en',
  });
  const url = `${API_BASE_URL}/api/v1/directions?${params.toString()}`;
  const json: any = await fetchJson(url, DIRECTIONS_TIMEOUT);

  const polyline: RoutePoint[] = Array.isArray(json?.polyline)
    ? json.polyline
        .map(
          (p: any): RoutePoint | null =>
            p && typeof p.latitude === 'number' && typeof p.longitude === 'number'
              ? { latitude: p.latitude, longitude: p.longitude }
              : null
        )
        .filter((p: RoutePoint | null): p is RoutePoint => p !== null)
    : [];

  return {
    distanceKm: typeof json?.distance_km === 'number' ? json.distance_km : null,
    durationMin: typeof json?.duration_min === 'number' ? json.duration_min : null,
    polyline,
    routeSource: json?.route_source === 'straight_line' ? 'straight_line' : 'osrm',
  };
}