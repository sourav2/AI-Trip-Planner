/**
 * Formatting and Helper Utilities for Map Data Structures
 */

export const mapFormatter = {
  /**
   * Generates boundary margins around a list of coordinates for maps
   * @param {Array<Array<number>>} coords - Array of [lat, lon] coordinates
   * @returns {Array<Array<number>>|null} Bounds [southWest, northEast] or null
   */
  getBounds(coords) {
    if (!coords || coords.length === 0) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    coords.forEach(coord => {
      if (coord && coord.length >= 2) {
        const [lat, lon] = coord;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (coord[1] < minLon) minLon = lon;
        if (coord[1] > maxLon) maxLon = lon;
      }
    });

    if (minLat === Infinity) return null;

    // Add padding (approx 10%)
    const latPadding = Math.max((maxLat - minLat) * 0.1, 0.01);
    const lonPadding = Math.max((maxLon - minLon) * 0.1, 0.01);

    return [
      [minLat - latPadding, minLon - lonPadding],
      [maxLat + latPadding, maxLon + lonPadding]
    ];
  },

  /**
   * Pretty-print distance values
   * @param {number} km 
   */
  formatDistance(km) {
    if (km === null || km === undefined) return "0 km";
    return `${km.toFixed(1)} km`;
  },

  /**
   * Pretty-print duration hours
   * @param {number} hours 
   */
  formatDuration(hours) {
    if (hours === null || hours === undefined) return "0 mins";
    if (hours < 1) {
      return `${Math.round(hours * 60)} mins`;
    }
    const hh = Math.floor(hours);
    const mm = Math.round((hours - hh) * 60);
    return mm > 0 ? `${hh} hr ${mm} min` : `${hh} hr`;
  }
};
