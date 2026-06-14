/**
 * Geocoding Service using OpenStreetMap Nominatim
 */

import { envConfig } from '../envConfig';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const LOCAL_PRESETS = {
  "delhi": [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090],
  "kolkata": [22.5726, 88.3639],
  "mumbai": [19.0760, 72.8777],
  "bangalore": [12.9716, 77.5946],
  "bengaluru": [12.9716, 77.5946],
  "jaipur": [26.9124, 75.7873],
  "udaipur": [24.5854, 73.7125],
  "goa": [15.2993, 74.1240],
  "panaji": [15.4909, 73.8278],
  "shillong": [25.5788, 91.8831],
  "cherrapunji": [25.2702, 91.7323],
  "munnar": [10.0889, 77.0595],
  "alleppey": [9.4981, 76.3388],
  "guwahati": [26.1445, 91.7362],
  "agra": [27.1767, 78.0081],
  "dehradun": [30.3165, 78.0322],
  "darjeeling": [27.0410, 88.2627],
  "kerala": [10.8505, 76.2711],
  "manali": [32.2396, 77.1887],
  "shimla": [31.1048, 77.1734],
  "tamil nadu": [11.1271, 78.6569]
};

export const geocodingService = {
  /**
   * Search for locations matching the search query (for autocomplete suggestions)
   */
  async searchLocation(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [];
    }

    const qClean = query.trim();
    const qLower = qClean.toLowerCase();

    try {
      const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(qClean)}&format=json&limit=5&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AntigravityTravelPlanner/1.0 (contact: support@antigravity.travel)'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim search failed: ${response.status}`);
      }

      const data = await response.json();
      const results = data.map(item => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      }));

      // Inject local presets if we don't have enough results
      if (results.length < 5) {
        for (const [key, coords] of Object.entries(LOCAL_PRESETS)) {
          if (key.includes(qLower) || qLower.includes(key)) {
            // Avoid duplicate name match in results
            const nameStart = key.charAt(0).toUpperCase() + key.slice(1);
            if (!results.some(r => r.name.toLowerCase().startsWith(key))) {
              results.push({
                name: `${nameStart}, India`,
                lat: coords[0],
                lon: coords[1]
              });
            }
          }
        }
      }

      return results.slice(0, 5);
    } catch (error) {
      console.error("[geocodingService] Autocomplete query failed:", error);
      
      // Offline / Error Fallback using presets matching
      const fallbackResults = [];
      for (const [key, coords] of Object.entries(LOCAL_PRESETS)) {
        if (key.includes(qLower) || qLower.includes(key)) {
          const nameStart = key.charAt(0).toUpperCase() + key.slice(1);
          fallbackResults.push({
            name: `${nameStart}, India`,
            lat: coords[0],
            lon: coords[1]
          });
        }
      }
      return fallbackResults.slice(0, 5);
    }
  },

  /**
   * Resolves a query into coordinates [lat, lon]
   */
  async getCoordinates(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [20.5937, 78.9629]; // Default: center of India
    }

    const qClean = query.trim();
    const qLower = qClean.toLowerCase();

    try {
      const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(qClean)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AntigravityTravelPlanner/1.0 (contact: support@antigravity.travel)'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim query failed: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        console.log(`[geocodingService] Geocoding success for "${qClean}":`, coords);
        return coords;
      }
    } catch (error) {
      console.error("[geocodingService] Geocoding API failed:", error);
    }

    // Presets Fallback
    for (const [key, coords] of Object.entries(LOCAL_PRESETS)) {
      if (qLower.includes(key) || key.includes(qLower)) {
        console.log(`[geocodingService] Match found in presets for "${qClean}":`, coords);
        return coords;
      }
    }

    // Synthetic Offset Fallback using a deterministic hash
    let hash = 0;
    for (let i = 0; i < qClean.length; i++) {
      hash = qClean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = (hash % 100) / 100.0 - 0.5;
    const lonOffset = (Math.floor(hash / 100) % 100) / 100.0 - 0.5;
    const fallbackCoords = [20.5937 + latOffset, 78.9629 + lonOffset];
    console.warn(`[geocodingService] Generated fallback coords for "${qClean}":`, fallbackCoords);
    return fallbackCoords;
  }
};
