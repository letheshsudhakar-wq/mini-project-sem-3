/**
 * Reverse Geocoding service using OpenStreetMap Nominatim API.
 * Converts latitude and longitude into human-readable street addresses.
 */

const geocodeCache = new Map<string, string>();

export interface ReverseGeocodeResult {
  address: string;
  displayName: string;
  error?: string;
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  if (geocodeCache.has(cacheKey)) {
    const cachedAddress = geocodeCache.get(cacheKey)!;
    return {
      address: cachedAddress,
      displayName: cachedAddress,
    };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en',
      },
      signal: signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Geocoding failed with HTTP status ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      return {
        address: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        displayName: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      };
    }

    // Construct a concise, readable address
    const addressObj = data.address || {};
    const road = addressObj.road || addressObj.pedestrian || addressObj.street || addressObj.suburb;
    const houseNumber = addressObj.house_number ? `${addressObj.house_number}, ` : '';
    const neighbourhood = addressObj.neighbourhood || addressObj.suburb || addressObj.district;
    const city = addressObj.city || addressObj.town || addressObj.village || addressObj.county;
    const postcode = addressObj.postcode ? ` ${addressObj.postcode}` : '';

    let formatted = '';
    if (road) {
      formatted = `${houseNumber}${road}`;
      if (neighbourhood && neighbourhood !== road) formatted += `, ${neighbourhood}`;
      if (city) formatted += `, ${city}${postcode}`;
    } else {
      formatted = data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }

    geocodeCache.set(cacheKey, formatted);

    return {
      address: formatted,
      displayName: data.display_name || formatted,
    };
  } catch (err: any) {
    console.warn('[CivicFix Geocode] Geocoding request notice:', err?.message || err);
    // Graceful fallback to formatted coordinate string
    const fallback = `Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    return {
      address: fallback,
      displayName: fallback,
      error: err?.message,
    };
  }
}
