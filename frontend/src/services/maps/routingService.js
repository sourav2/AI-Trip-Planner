/**
 * Routing Service using Project OSRM (Open Source Routing Machine)
 */

const OSRM_BASE = 'https://router.project-osrm.org';

/**
 * Calculates straight line distance (Haversine formula)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371.0; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const routingService = {
  /**
   * Retrieves driving route details including distance, duration and geometry coordinates
   * @param {Array<Array<number>>} coords - Array of [lat, lon] coordinates
   * @param {boolean} allowInternationalTransit - Whether to allow crossing country borders
   */
  async getDrivingRoute(coords, allowInternationalTransit = false) {
    if (!coords || coords.length < 2) {
      return { distance: 0.0, duration: 0.0, geometry: [] };
    }

    try {
      // Format coordinates for OSRM: lon,lat separated by semicolons
      const coordStrings = coords.map(c => `${c[1]},${c[0]}`);
      const coordsPath = coordStrings.join(';');
      const url = `${OSRM_BASE}/route/v1/driving/${coordsPath}?overview=full&geometries=geojson`;

      console.log(`[routingService] Requesting OSRM route for ${coords.length} coordinates...`);
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`OSRM routing failed: status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round((route.distance / 1000.0) * 10) / 10;
        const durationHours = Math.round((route.duration / 3600.0) * 10) / 10;
        
        // Convert geojson coordinates [lon, lat] back to [lat, lon]
        const geometry = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);

        console.log(`[routingService] Route found: Distance = ${distanceKm} km, Duration = ${durationHours} hours`);
        return {
          distance: distanceKm,
          duration: durationHours,
          geometry
        };
      }
    } catch (error) {
      console.error("[routingService] OSRM route query failed:", error);
    }

    // Straight line fallback with winding factor
    console.warn("[routingService] Falling back to straight-line math calculation.");
    let totalDist = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      totalDist += calculateHaversineDistance(
        coords[i][0], coords[i][1],
        coords[i + 1][0], coords[i + 1][1]
      );
    }

    const roadDist = Math.round(totalDist * 1.25 * 10) / 10;
    const duration = Math.round((roadDist / 55.0) * 10) / 10; // average 55 km/h driving speed

    return {
      distance: roadDist,
      duration,
      geometry: coords
    };
  },

  /**
   * Generates a distance/duration matrix between origins and destinations
   * @param {Array<Array<number>>} origins
   * @param {Array<Array<number>>} destinations
   */
  async getDistanceMatrix(origins, destinations) {
    // Return distance matrix using straight line distances for efficiency, 
    // but structure it properly.
    const matrix = origins.map((origin) => {
      return destinations.map((destination) => {
        const dist = calculateHaversineDistance(origin[0], origin[1], destination[0], destination[1]);
        const duration = dist / 50.0; // average speed in hours
        return {
          distance: Math.round(dist * 10) / 10,
          duration: Math.round(duration * 10) / 10
        };
      });
    });

    return matrix;
  }
};
