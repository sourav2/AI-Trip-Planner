import { travelApi } from './api';

// Reusable Geography Service for synchronizing Leaflet Map and Blueprint Travel Atlas
export const geographyProvider = {
  /**
   * Resolves coordinates from the active trip and selected attractions cart.
   * Exposes base city fallbacks for supported destination states.
   */
  getCoordinates(activeTrip, selectedPlaces = []) {
    const destination = activeTrip?.destination || '';
    
    // Resolve standard base city/port coordinates
    const baseCityCoords = destination.toLowerCase().includes('meghalaya') ? [25.5788, 91.8831] :
                           destination.toLowerCase().includes('kerala') ? [9.9312, 76.2673] :
                           destination.toLowerCase().includes('rajasthan') ? [26.9124, 75.7873] :
                           destination.toLowerCase().includes('sikkim') ? [27.3314, 88.6138] : [20.5937, 78.9629];

    const startCoords = activeTrip?.start_coords || activeTrip?.startLocationCoords || null;
    const destCoords = activeTrip?.dest_coords || activeTrip?.destinationCoords || baseCityCoords;

    const stopsCoords = selectedPlaces
      .map(p => p.coords || [p.lat, p.lon])
      .filter(c => c && c[0] && c[1]);

    return {
      startCoords,
      destCoords,
      stopsCoords,
      baseCityCoords
    };
  },

  /**
   * Fetches state boundary GeoJSON data.
   */
  async fetchStateBoundary(destination) {
    if (!destination) return null;
    try {
      const response = await fetch(`/api/state-boundary?destination=${encodeURIComponent(destination)}`);
      if (!response.ok) throw new Error("Failed to load boundary");
      return await response.json();
    } catch (err) {
      console.error("geographyProvider: Failed to load boundary:", err);
      return null;
    }
  },

  /**
   * Fetches OSRM transit route geometry coordinates.
   */
  async fetchOSRMRoute(startCoords, destCoords, stopsCoords = [], allowInternationalTransit = false) {
    if (!startCoords || !destCoords) return null;
    try {
      const allCoords = [startCoords, ...stopsCoords, destCoords];
      const routeData = await travelApi.fetchRoute(allCoords, allowInternationalTransit);
      return routeData?.geometry || null;
    } catch (err) {
      console.error("geographyProvider: Live route fetch failed:", err);
      return null;
    }
  }
};
